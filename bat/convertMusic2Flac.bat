:: 使用ffmpeg将音乐文件转换为flac格式
:: ^((.*)\\(.*)\.ape)$
:: C:\Software\jellyfin_10.8.10\ffmpeg -i "$1" -c:a flac "$2\\$3.flac"
:: set file to ansi encoding

C:\Software\jellyfin_10.8.10\ffmpeg -i "D:\Music\han\Beyond - 光辉岁月.ape" -c:a flac "D:\Music\han\Beyond - 光辉岁月.flac"
C:\Software\jellyfin_10.8.10\ffmpeg -i "D:\Music\Instrumental\Bandari - Childhoood Memory.ape" -c:a flac "D:\Music\Instrumental\Bandari - Childhoood Memory.flac"

