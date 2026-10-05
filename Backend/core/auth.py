import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.authentication import BaseAuthentication
from .models import Usuario

try:
    load_dotenv()
    project_id = os.environ.get("FIREBASE_PROJECT_ID")
    client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
    private_key_raw = os.environ.get("FIREBASE_PRIVATE_KEY", "")
    private_key = private_key_raw.replace('\\n', '\n')

    if project_id and client_email and private_key:
        firebase_cred_dict = {
            "type": "service_account",
            "project_id": project_id,
            "private_key": private_key,
            "client_email": client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }

        cred = credentials.Certificate(firebase_cred_dict)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin inicializado com sucesso via variáveis de ambiente (.env)!")
    else:
        print("AVISO: Variáveis do Firebase não encontradas no .env. Autenticação desativada.")

except ValueError:
    pass


class FirebaseAuthentication(BaseAuthentication):
    """
    Custom authentication to validate Firebase ID Tokens.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        id_token = auth_header.split('Bearer ')[1]
        try:
            # Verifica se o app do Firebase já foi inicializado de forma segura
            try:
                firebase_admin.get_app()
            except (ValueError, RuntimeError):
                project_id = os.environ.get("FIREBASE_PROJECT_ID")
                client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
                private_key_raw = os.environ.get("FIREBASE_PRIVATE_KEY", "")
                private_key = private_key_raw.replace('\\n', '\n')

                if project_id and client_email and private_key:
                    firebase_cred_dict = {
                        "type": "service_account",
                        "project_id": project_id,
                        "private_key": private_key,
                        "client_email": client_email,
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                    cred = credentials.Certificate(firebase_cred_dict)
                    firebase_admin.initialize_app(cred)
                else:
                    print("AVISO: Variáveis do Firebase não encontradas no .env.")

            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
            is_admin = decoded_token.get('admin', False)
            
            usuario, created = Usuario.objects.get_or_create(
                firebase_uid=uid,
                defaults={
                    'nome': decoded_token.get('name', 'Usuário AltStream'),
                    'link_imagem': decoded_token.get('picture', ''),
                }
            )

            return (usuario, {'is_firebase_admin': is_admin})
            
        except Exception as e:
            print(f"Firebase Auth Error: {e}")
            return None


class IsFirebaseAdmin(BasePermission):
    """
    Permission to only allow users who have the admin custom claim in their Firebase token.
    """
    def has_permission(self, request, view):
        auth_data = getattr(request, 'auth', None)
        if isinstance(auth_data, dict):
            return auth_data.get('is_firebase_admin', False)
        
        return False


def get_firebase_user(request):
    """Helper to get the authenticated Firebase user from request"""
    return getattr(request, 'user', None)