# metavis1on

Sessiz, seçici ve güçlü bir dijital alan.

Tek sayfa Discord giriş sitesi. Kalabalık değil, çizgi önemli.

## Yapı

```
index.html           Ana sayfa (tek sayfa)
css/style.css        Stil dosyası (5 tema)
js/main.js           Tema, menü, animasyon
assets/              Logo dosyaları
```

## Logo Dosyaları

| Dosya | Açıklama | Kullanım |
|-------|----------|----------|
| `logo_yazisiz.png` | Sadece sembol | Header, hero, favicon, küçük ikon |
| `logo_altyazi.png` | Sembol + alt yazı | OG card, büyük vitrin |
| `logo_sagyazi.png` | Sembol + sağ yazı | Footer, yatay marka alanları |

Logo dosyalarını değiştirme, silme veya yeniden adlandırma.

## Temalar

5 tema seçeneği mevcut. Seçim localStorage'da saklanır.

- **Karanlık** — varsayılan, koyu grafit + soğuk mavi
- **Aydınlık** — beyaz/gri + lacivert
- **Mor** — koyu mor + mor vurgular
- **Mavi** — lacivert + mavi vurgular
- **Kızıl** — koyu siyah + kırmızı/amber vurgular

## Discord

Discord davet linki:

```
https://discord.gg/tktMR9fKYW
```

`index.html` dosyasında 4 yerde kullanılır (hero butonu, Discord paneli, header butonu, footer).

## Korunan Dosyalar

Bu dosyalara dokunulmadı ve ileride ayrı ele alınacak:

- `tetris.html`
- `game.html`
- `admin/borc/index.html`
- `borc.html`
