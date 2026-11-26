from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Serie, Episodio, UsuarioEpisodios, MinhaLista, AvaliacaoEpisodio
from .serializers import SerieSerializer, EpisodioSerializer, EpisodioPostSerializer
from drf_yasg.utils import swagger_auto_schema
from .auth import CognitoAuthentication, IsCognitoAdmin

class CheckAdminView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request):
        auth_data = getattr(request, 'auth', {})
        is_admin = False
        
        if isinstance(auth_data, dict):
            is_admin = auth_data.get('is_cognito_admin', False)
        
        return Response({"isAdmin": is_admin})

class HomeView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request):
        return Response({"message": f"Bem-vindo ao AltStream API, {request.user.nome}!"})

class ListarSeriesView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request):
        series = Serie.objects.all()
        serializer = SerieSerializer(series, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not IsCognitoAdmin().has_permission(request, self):
            return Response({'detail': 'You do not have permission to perform this action.'}, status=403)

        serializer = SerieSerializer(data=request.data)
        if serializer.is_valid():
            serie = serializer.save()
            return Response({"id": serie.id, "message": "Série criada com sucesso!"}, status=201)
        return Response(serializer.errors, status=400)

class DetalheSerieView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request, pk):
        try:
            serie = Serie.objects.get(pk=pk)
            serializer = SerieSerializer(serie)
            return Response(serializer.data)
        except Serie.DoesNotExist:
            return Response({'error': 'Série não encontrada'}, status=404)

    @swagger_auto_schema(request_body=SerieSerializer)
    def post(self, request, pk=None):
        if not IsCognitoAdmin().has_permission(request, self):
            return Response({'detail': 'You do not have permission to perform this action.'}, status=403)
            
        try:
            serie = Serie.objects.get(pk=pk)
        except Serie.DoesNotExist:
            return Response({'error': 'Série não encontrada'}, status=404)

        serializer = SerieSerializer(serie, data=request.data, partial=True)
        if serializer.is_valid():
            serie = serializer.save()
            return Response({"id": serie.id, "message": "Série atualizada com sucesso!"}, status=200)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if not IsCognitoAdmin().has_permission(request, self):
            return Response({'detail': 'You do not have permission to perform this action.'}, status=403)
            
        try:
            serie = Serie.objects.get(pk=pk)
            serie.delete()
            return Response({"message": "Série deletada com sucesso!"}, status=204)
        except Serie.DoesNotExist:
            return Response({'error': 'Série não encontrada'}, status=404)

class MinhaListaView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request):
        usuario = request.user
        if not usuario or usuario.__class__.__name__ == 'AnonymousUser':
            return Response({'error': 'Autenticação necessária'}, status=401)
            
        itens_lista = MinhaLista.objects.filter(usuario=usuario).select_related('serie')
        
        data = []
        for item in itens_lista:
            data.append({
                'id': item.id,
                'serie_id': item.serie.id,
                'serie_nome': item.serie.nome,
                'serie_imagem': item.serie.link_imagem
            })
        return Response(data)

    def post(self, request):
        usuario = request.user
        if not usuario or usuario.__class__.__name__ == 'AnonymousUser':
            return Response({'error': 'Autenticação necessária'}, status=401)
            
        serie_id = request.data.get('serie_id')
        
        if not serie_id:
            return Response({'error': 'serie_id é obrigatório'}, status=400)
            
        try:
            serie = Serie.objects.get(pk=serie_id)
            # Toggle logic: add if not exists, remove if exists
            item, created = MinhaLista.objects.get_or_create(usuario=usuario, serie=serie)
            
            if not created:
                item.delete()
                return Response({'message': 'Série removida da lista', 'status': 'removed'})
                
            return Response({'message': 'Série adicionada à lista', 'status': 'added'})
            
        except Serie.DoesNotExist:
            return Response({'error': 'Série não encontrada'}, status=404)


class ListarEpisodiosView(APIView):
    def get(self, request, serie_id):
        episodios = Episodio.objects.filter(serie_id=serie_id)
        serializer = EpisodioSerializer(episodios, many=True)
        return Response(serializer.data)

class DetalheEpisodioView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request, pk):
        try:
            episodio = Episodio.objects.get(pk=pk)
            serializer = EpisodioSerializer(episodio)
            return Response(serializer.data)
        except Episodio.DoesNotExist:
            return Response({'error': 'Episódio não encontrado'}, status=404)

    @swagger_auto_schema(
        operation_description="Cria um novo episódio para a série especificada na URL",
        request_body=EpisodioPostSerializer
    )
    def post(self, request, pk=None, serie_id=None):
        if not IsCognitoAdmin().has_permission(request, self):
            return Response({'detail': 'Apenas administradores podem criar episódios.'}, status=403)
            
        s_id = serie_id if serie_id is not None else pk
        
        data = request.data.copy()
        serializer = EpisodioPostSerializer(data=data)
        if serializer.is_valid():
            episodio = serializer.save(serie_id=s_id)
            return Response({"id": episodio.id, "message": "Episódio cadastrado com sucesso!"}, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        if not IsCognitoAdmin().has_permission(request, self):
            return Response({'detail': 'Apenas administradores podem deletar episódios.'}, status=403)
            
        try:
            episodio = Episodio.objects.get(pk=pk)
            episodio.delete()
            return Response({"message": "Episódio deletado com sucesso!"}, status=204)
        except Episodio.DoesNotExist:
            return Response({'error': 'Episódio não encontrado'}, status=404)

class ListarContinuarView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def get(self, request):
        usuario = request.user
        if not usuario or usuario.__class__.__name__ == 'AnonymousUser':
            return Response({'error': 'Autenticação necessária'}, status=401)
        
        progresso = UsuarioEpisodios.objects.filter(usuario=usuario).select_related('episodio').values(
            'episodio__id', 'episodio__nome', 'episodio__link_imagem', 'episodio__serie__nome', 'tempo'
        )
        return Response(list(progresso))

    def post(self, request):
        usuario = request.user
        if not usuario or usuario.__class__.__name__ == 'AnonymousUser':
            return Response({'error': 'Autenticação necessária'}, status=401)

        episodio_id = request.data.get('episodio_id')
        tempo = request.data.get('tempo')

        if episodio_id is None or tempo is None:
            return Response({'error': 'episodio_id e tempo são obrigatórios'}, status=400)

        try:
            progresso, created = UsuarioEpisodios.objects.update_or_create(
                usuario=usuario,
                episodio_id=episodio_id,
                defaults={'tempo': tempo}
            )
            return Response({'message': 'Progresso salvo com sucesso!', 'tempo': progresso.tempo}, status=200)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class ListarNovosEpisodiosView(APIView):
    def get(self, request):
        episodios = Episodio.objects.all().order_by('-data').values('id', 'nome', 'link_imagem', 'link_midia', 'serie__nome', 'temporada_numero', 'numero', 'data')
        return Response(list(episodios))

class PesquisarSeriesView(APIView):
    def get(self, request):
        query = request.GET.get('q', '')
        if not query:
            return Response([])
        
        series = Serie.objects.filter(nome__icontains=query)
        serializer = SerieSerializer(series, many=True)
        return Response(serializer.data)


class ToggleLikeView(APIView):
    authentication_classes = [CognitoAuthentication]
    permission_classes = []

    def post(self, request, pk):
        usuario = request.user
        if not usuario or usuario.__class__.__name__ == 'AnonymousUser':
            return Response({'error': 'Autenticação necessária'}, status=401)

        try:
            episodio = Episodio.objects.get(pk=pk)

            avaliacao, created = AvaliacaoEpisodio.objects.get_or_create(
                usuario=usuario, 
                episodio=episodio,
                defaults={'curtida': action_is_like}
            )

            if not created:
                if avaliacao.curtida == action_is_like:
                    if action_is_like:
                        episodio.curtidas = max(0, episodio.curtidas - 1)
                    else:
                        episodio.descurtidas = max(0, episodio.descurtidas - 1)
                    
                    avaliacao.delete()
                else:
                    if action_is_like:
                        episodio.descurtidas = max(0, episodio.descurtidas - 1)
                        episodio.curtidas += 1
                    else:
                        episodio.curtidas = max(0, episodio.curtidas - 1)
                        episodio.descurtidas += 1
                    
                    avaliacao.curtida = action_is_like
                    avaliacao.save()
            else:
                if action_is_like:
                    episodio.curtidas += 1
                else:
                    episodio.descurtidas += 1

            episodio.save()
            return Response({'curtidas': episodio.curtidas, 'descurtidas': episodio.descurtidas})

        except Episodio.DoesNotExist:
            return Response({'error': 'Episódio não encontrado'}, status=404)
