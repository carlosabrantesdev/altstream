from django.urls import path
from . import views

urlpatterns = [
    path('check-admin/', views.CheckAdminView.as_view(), name='check_admin'),
    path('', views.HomeView.as_view(), name='home'),
    path('series/', views.ListarSeriesView.as_view(), name='listar_series'),
    path('series/<int:pk>/', views.DetalheSerieView.as_view(), name='detalhe_serie'),
    path('series/<int:serie_id>/episodios/', views.ListarEpisodiosView.as_view(), name='listar_episodios'),
    path('series/<int:serie_id>/episodios/create/', views.DetalheEpisodioView.as_view(), name='criar_episodio'),
    path('episodios/<int:pk>/', views.DetalheEpisodioView.as_view(), name='detalhe_episodio'),
    path('continuar/', views.ListarContinuarView.as_view(), name='listar_continuar'),
    path('novos-episodios/', views.ListarNovosEpisodiosView.as_view(), name='listar_novos_episodios'),
    path('pesquisar/', views.PesquisarSeriesView.as_view(), name='pesquisar_series'),
    path('episodios/<int:pk>/like/', views.ToggleLikeView.as_view(), name='toggle_like'),
    path('lista/', views.MinhaListaView.as_view(), name='minha_lista'),
    path('ai/chat/', views.AIChatView.as_view(), name='ai_chat'),
]
