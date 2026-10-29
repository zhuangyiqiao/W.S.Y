"""One-off audio preparation; originals and ffmpeg are deliberately not published.
Use ffmpeg 7.1 at the path below, or pass a local ffmpeg executable as argv[1].
Download the explicitly listed files only after checking their source-page licenses.
"""
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(__file__).resolve().parent.parent
ffmpeg=sys.argv[1] if len(sys.argv)>1 else str(root/'.audio-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
sources=[
 ('coffee','coffee.ogg','coffee-cooking','christoph','CC-BY-3.0','https://opengameart.org/sites/default/files/coffee.ogg'),
 ('cup','cup.ogg','cutlery-sounds','TinyWorlds','CC0-1.0','https://opengameart.org/sites/default/files/cup_on_table_01.ogg'),
 ('rain','rain.ogg','rain-ambient-not-loopable-2-versions-available','OveMelaa / Ove Melaa','CC0-1.0','https://opengameart.org/sites/default/files/Ove%20Melaa%20-%20Rainy%20%28NOT%20loopable%29.ogg'),
 ('waves','waves.flac','beach-ocean-waves','jasinski (submitted by qubodup)','CC0-1.0','https://opengameart.org/sites/default/files/wave_01_cc0-18363__jasinski__alkaibeach.flac'),
 ('fire','fire.ogg','fire-crackling','AntumDeluge','CC0-1.0','https://opengameart.org/sites/default/files/fire-1_0.ogg'),
 ('crickets','crickets.mp3','crickets-ambient-noise-loopable','Wolfgang_ / Ted Kerr','CC0-1.0','https://opengameart.org/sites/default/files/crickets_1.mp3')]
manifest=[]
for name,original,page,author,license,url in sources:
 src=root/'.audio-originals'/original; dst=root/'assets/audio'/f'{name}.mp3'
 args=['-i',str(src)]+(['-ss','10','-t','60'] if name=='rain' else [])+['-af','loudnorm=I=-24:TP=-4:LRA=7','-ar','44100','-ac','1','-c:a','libmp3lame','-b:a','96k','-map_metadata','-1']
 subprocess.run([ffmpeg,'-v','error','-y',*args,str(dst)],check=True)
 subprocess.run([ffmpeg,'-v','error','-i',str(dst),'-f','null','-'],check=True)
 manifest.append(dict(file=dst.name,sourcePage='https://opengameart.org/content/'+page,download=url,author=author,license=license,licenseUrl='https://creativecommons.org/licenses/by/3.0/' if license=='CC-BY-3.0' else 'https://creativecommons.org/publicdomain/zero/1.0/',checked='2026-10-29',originalSha256=hashlib.sha256(src.read_bytes()).hexdigest(),sha256=hashlib.sha256(dst.read_bytes()).hexdigest(),bytes=dst.stat().st_size,processing='FFmpeg 7.1; mono 44.1kHz MP3 96kbps; loudnorm I=-24 TP=-4 LRA=7'+('; excerpt 10–70 seconds' if name=='rain' else '')))
(root/'assets/audio/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Encoded and decoded 6 recordings:',sum(m['bytes'] for m in manifest),'bytes')
