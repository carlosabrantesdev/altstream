from django.db import models

class Usuario(models.Model):
    firebase_uid = models.CharField(max_length=128, unique=True)
    link_imagem = models.URLField(max_length=500, blank=True, null=True)
    nome = models.CharField(max_length=255)
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

class Genre(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome

class Serie(models.Model):
    link_imagem = models.URLField(max_length=500, blank=True, null=True)
    banner = models.URLField(max_length=500, blank=True, null=True)
    nome = models.CharField(max_length=255)
    generos = models.ManyToManyField(Genre, related_name='series')
    sinopse = models.TextField()
    data_lancamento = models.DateField()
    destaque_landing_page = models.BooleanField(default=False, help_text="Série exibida na landing page (limite sugerido de 5)")

    def __str__(self):
        return self.nome

class Temporada(models.Model):
    serie = models.ForeignKey(Serie, on_delete=models.CASCADE, related_name='temporadas')
    numero = models.IntegerField()
    nome = models.CharField(max_length=255, blank=True, null=True)
    data_lancamento = models.DateField(blank=True, null=True)

    class Meta:
        unique_together = ('serie', 'numero')

    def __str__(self):
        return f"{self.serie.nome} - Temporada {self.numero}"

class Episodio(models.Model):
    serie = models.ForeignKey(Serie, on_delete=models.CASCADE, related_name='episodios')
    temporada_numero = models.IntegerField()
    link_imagem = models.URLField(max_length=500, blank=True, null=True)
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, null=True)
    link_midia = models.URLField(max_length=500)
    numero = models.IntegerField()
    data = models.DateTimeField(auto_now_add=True)
    curtidas = models.PositiveIntegerField(default=0)
    descurtidas = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.serie.nome} - T{self.temporada_numero}:E{self.numero}: {self.nome}"

class UsuarioEpisodios(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='progresso_episodios')
    episodio = models.ForeignKey(Episodio, on_delete=models.CASCADE)
    tempo = models.IntegerField(help_text="Tempo em segundos")

    def __str__(self):
        return f"{self.usuario.nome} - {self.episodio.nome} ({self.tempo}s)"

class MinhaLista(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='minha_lista')
    serie = models.ForeignKey(Serie, on_delete=models.CASCADE)
    data_adicao = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('usuario', 'serie')

    def __str__(self):
        return f"{self.usuario.nome} - {self.serie.nome}"

class AvaliacaoEpisodio(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='avaliacoes')
    episodio = models.ForeignKey(Episodio, on_delete=models.CASCADE, related_name='avaliacoes')
    curtida = models.BooleanField()

    class Meta:
        unique_together = ('usuario', 'episodio')

    def __str__(self):
        return f"{self.usuario.nome} - {self.episodio.nome} ({'Like' if self.curtida else 'Dislike'})"
