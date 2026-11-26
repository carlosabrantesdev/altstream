import jwt
from rest_framework.permissions import BasePermission
from rest_framework.authentication import BaseAuthentication
from .models import Usuario

class CognitoAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            cognito_uid = decoded_token.get('sub')
            
            if not cognito_uid:
                return None

            usuario, created = Usuario.objects.get_or_create(
                firebase_uid=cognito_uid,
                defaults={
                    'nome': decoded_token.get('name', 'Usuário AltStream'),
                    'link_imagem': decoded_token.get('picture', ''),
                }
            )

            groups = decoded_token.get('cognito:groups', [])
            is_admin = any(group.lower() == 'admin' for group in groups)

            return (usuario, {'is_cognito_admin': is_admin})
            
        except Exception as e:
            print(f"Cognito Auth Error: {e}")
            return None

class IsCognitoAdmin(BasePermission):
    def has_permission(self, request, view):
        auth_data = getattr(request, 'auth', None)
        if isinstance(auth_data, dict):
            return auth_data.get('is_cognito_admin', False)
        
        return False
