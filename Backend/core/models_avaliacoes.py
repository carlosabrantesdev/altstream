from django.db import models
from .models import Usuario, Episodio

class AvaliacaoEpisodio(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='avaliacoes')
    episodio = models.ForeignKey(Episodio, on_delete=models.CASCADE, related_name='avaliacoes')
    like = models.BooleanField()

    class Meta:
        unique_together = ('usuario', 'episodio')

    def __str__(self):
        return f"{self.usuario.nome} - {self.episodio.nome} ({'Like' if self.like else 'Dislike'})"
