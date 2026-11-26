from rest_framework import serializers
from .models import Serie, Episodio, Genre

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'nome']

class SerieSerializer(serializers.ModelSerializer):
    data_lancamento = serializers.DateField(format="%Y-%m-%d")
    generos = GenreSerializer(many=True, read_only=True)

    class Meta:
        model = Serie
        fields = '__all__'

class EpisodioSerializer(serializers.ModelSerializer):
    serie = SerieSerializer(read_only=True)
    serie_id = serializers.PrimaryKeyRelatedField(
        queryset=Serie.objects.all(), 
        source='serie', 
        write_only=True
    )

    class Meta:
        model = Episodio
        fields = '__all__'

class EpisodioPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episodio
        fields = ['nome', 'descricao', 'link_imagem', 'link_midia', 'numero', 'temporada_numero']
