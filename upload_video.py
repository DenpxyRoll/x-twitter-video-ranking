#!/usr/bin/env python3
"""
X（Twitter）動画 → DaVinci Resolveでトリミング・モザイク → mixhost自動アップロードツール
使い方: python3 upload_video.py
"""

import os, sys, json, subprocess, uuid, ftplib, glob, time
from datetime import datetime
import imageio_ffmpeg

YTDLP  = '/Users/naramitsuru/Library/Python/3.9/bin/yt-dlp'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

CONFIG_FILE = os.path.expanduser('~/.twvideo_config.json')
PUBLIC_URL  = 'https://videos.twvideo-rank.net'

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(SCRIPT_DIR, '動画格納')   # ダウンロード先（DaVinci Resolveから読み込むフォルダ）
EXPORT_DIR   = os.path.join(SCRIPT_DIR, 'export')      # DaVinci Resolveの書き出し先

# =============================================================
#  クリーンアップ
# =============================================================
def cleanup_all(download_path=None):
    """
    ・export/ 内の mp4 をすべて削除
    ・download_path が指定されていれば元の動画ファイルも削除
    """
    # export/ のクリーンアップ（mp4 + webm 両方）
    if os.path.isdir(EXPORT_DIR):
        targets = glob.glob(os.path.join(EXPORT_DIR, '*.mp4')) + \
                  glob.glob(os.path.join(EXPORT_DIR, '*.webm'))
        if targets:
            print('\n🧹 export/ をクリーンアップ中...')
            for f in targets:
                try:
                    os.remove(f)
                    print(f'   削除: {os.path.basename(f)}')
                except Exception as e:
                    print(f'   削除失敗: {f} ({e})')

    # ダウンロード元ファイルのクリーンアップ
    if download_path and os.path.exists(download_path):
        try:
            os.remove(download_path)
            print(f'🧹 元動画を削除しました: {os.path.basename(download_path)}')
        except Exception as e:
            print(f'   元動画の削除失敗: {download_path} ({e})')

# =============================================================
#  FTP設定の読み書き
# =============================================================
def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}

def save_config(cfg):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(cfg, f)

def get_ftp_settings():
    cfg = load_config()
    if cfg.get('ftp_host') and cfg.get('ftp_user') and cfg.get('ftp_pass'):
        return cfg
    print('\n⚙️  FTP設定（初回のみ入力）')
    cfg['ftp_host'] = input('FTPホスト名（例: twvideo-rank.net）: ').strip()
    cfg['ftp_user'] = input('FTPユーザー名: ').strip()
    cfg['ftp_pass'] = input('FTPパスワード: ').strip()
    save_config(cfg)
    print('✅ FTP設定を保存しました')
    return cfg

# =============================================================
#  mixhostにFTPアップロード
# =============================================================
def upload_to_mixhost(local_path, filename):
    cfg = get_ftp_settings()
    file_size = os.path.getsize(local_path)
    uploaded = [0]

    def progress_callback(block):
        uploaded[0] += len(block)
        pct = uploaded[0] * 100 // file_size if file_size else 0
        print(f'\r   進捗: {pct}% ({uploaded[0] // 1024}KB / {file_size // 1024}KB)', end='', flush=True)

    print(f'⬆️  mixhostにアップロード中... ({filename})')
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        uploaded[0] = 0  # リトライ時にカウンタをリセット
        try:
            with ftplib.FTP_TLS() as ftp:
                ftp.connect(cfg['ftp_host'], 21, timeout=60)  # ポート21（Explicit TLS）、タイムアウト60秒
                ftp.auth()                                     # TLS認証
                ftp.prot_p()                                   # データ転送もTLS暗号化
                ftp.sock.settimeout(120)                       # ソケットタイムアウト120秒
                ftp.set_pasv(True)                             # パッシブモード
                ftp.login(cfg['ftp_user'], cfg['ftp_pass'])
                cwd = ftp.pwd()
                print(f'   (FTP接続先: {cwd})')
                if 'public_html' not in cwd:
                    try:
                        ftp.cwd('public_html')
                    except ftplib.error_perm:
                        pass
                try:
                    ftp.mkd('videos')
                except ftplib.error_perm:
                    pass
                ftp.cwd('videos')
                with open(local_path, 'rb') as f:
                    ftp.storbinary(f'STOR {filename}', f, callback=progress_callback)  # 進捗表示
                print()  # 改行
            return f'{PUBLIC_URL}/{filename}'
        except Exception as e:
            print(f'\n❌ アップロード失敗 ({attempt}/{max_retries}回目): {e}')
            if attempt < max_retries:
                print(f'   {attempt + 1}回目を試みます...')
                time.sleep(3)
            else:
                print('   リトライ上限に達しました。スキップします。')
                return None

# =============================================================
#  yt-dlp ダウンロード（Ctrl+C 対応）
# =============================================================
def run_ytdlp(args):
    """yt-dlp を実行。Ctrl+C で KeyboardInterrupt を raise する"""
    proc = subprocess.Popen(
        args,
        start_new_session=True   # 別プロセスグループ（yt-dlpに直接SIGINTが届かない）
    )
    try:
        proc.wait()
    except KeyboardInterrupt:
        print('\n⚠️  ダウンロードを中断しています...')
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        raise  # KeyboardInterrupt を上位へ伝播

# =============================================================
#  メイン処理
# =============================================================
def upload_one(x_url):
    # ダウンロード先フォルダを作成
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)

    # ファイル名を一意に決定（例: video_a1b2c3d4.mp4）
    unique_id  = uuid.uuid4().hex[:8]
    raw_path   = os.path.join(DOWNLOAD_DIR, f'original_{unique_id}.mp4')

    try:
        print('\n⏳ 動画をダウンロード中... （元の長さのまま・Ctrl+C でキャンセル可）')

        run_ytdlp([
            YTDLP,
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '--cookies-from-browser', 'chrome',
            '-o', raw_path,
            x_url
        ])

        # ダウンロードされたファイルを確認（yt-dlpが別名で保存した場合に対応）
        if not os.path.exists(raw_path):
            candidates = [
                os.path.join(DOWNLOAD_DIR, f)
                for f in os.listdir(DOWNLOAD_DIR)
                if f.endswith('.mp4')
            ]
            if candidates:
                # 最新のmp4を選ぶ
                raw_path = max(candidates, key=os.path.getmtime)
            else:
                print('❌ ダウンロード失敗: mp4ファイルが見つかりません')
                return True

        print(f'✅ ダウンロード完了！ → {raw_path}')

        # ─── DaVinci Resolve と ダウンロードフォルダを開く ───
        print('\n🎬 DaVinci Resolve を起動しています...')
        subprocess.Popen(['open', '-a', 'DaVinci Resolve'])
        time.sleep(1)
        print(f'📂 ダウンロードフォルダを開いています... ({DOWNLOAD_DIR})')
        subprocess.Popen(['open', DOWNLOAD_DIR])

        # ─── ユーザーへのアナウンス ───
        print('\n' + '=' * 65)
        print('🎬 DaVinci Resolve が開きました。以下の作業をお願いします:')
        print()
        print('  1. DaVinci Resolve のメディアプールに動画を読み込む')
        print('     （開いたフォルダから動画をドラッグ＆ドロップ）')
        print()
        print('  2. タイムラインで 5秒間 にトリミングする')
        print()
        print('  3. カラーページでモザイク（トラッキング）処理を行う')
        print()
        print('  4. 以下のエクスポート先フォルダに書き出す:')
        print(f'     👉 {EXPORT_DIR}')
        print()
        print('  書き出しが完了したら Enter キーを押してください。')
        print('  （中断する場合は Ctrl+C）')
        print('=' * 65)

        try:
            input()
        except KeyboardInterrupt:
            print('\n⚠️  中断されました。クリーンアップします...')
            cleanup_all(raw_path)
            return False

        # ─── export/ の最新 mp4 を取得 ───
        mp4_files = [
            os.path.join(EXPORT_DIR, f)
            for f in os.listdir(EXPORT_DIR)
            if f.lower().endswith('.mp4')
        ]
        if not mp4_files:
            print(f'❌ {EXPORT_DIR} 内にmp4ファイルが見つかりません。')
            print('   DaVinci Resolve での書き出しを確認してください。')
            return True

        latest_export = max(mp4_files, key=os.path.getmtime)

        # ─── 自動リネーム（video_YYYYMMDD_HHMMSS.mp4） ───
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        fname = f'video_{timestamp}.mp4'
        renamed_path = os.path.join(EXPORT_DIR, fname)
        try:
            os.rename(latest_export, renamed_path)
            latest_export = renamed_path
            print(f'\n✏️  ファイル名を自動変更しました: {os.path.basename(latest_export)}')
        except Exception as e:
            print(f'\n⚠️  リネーム失敗（元のファイル名で続行）: {e}')
            fname = os.path.basename(latest_export)

        print(f'📂 変換元ファイル: {fname}')

        # ─── mp4 → WebM 変換 ───
        # メタデータを削除したmp4で上書き
        print('\n🔒 メタデータを削除中...')
        clean_path = os.path.join(EXPORT_DIR, f'clean_{fname}')
        try:
            result = subprocess.run(
                [FFMPEG, '-i', latest_export, '-map_metadata', '-1', '-c:v', 'copy', '-c:a', 'copy', '-y', clean_path],
                capture_output=True
            )
            if result.returncode == 0 and os.path.exists(clean_path):
                os.replace(clean_path, latest_export)
                print('✅ メタデータ削除完了')
            else:
                print('⚠️   メタデータ削除失敗（そのまま続行）')
        except Exception as ex:
            print(f'⚠️   メタデータ削除エラー（そのまま続行）: {ex}')

        webm_fname = fname.replace('.mp4', '.webm')
        webm_path  = os.path.join(EXPORT_DIR, webm_fname)
        print(f'\n🔄 WebMに変換中… ({webm_fname})')
        print('   (数十秒に５秒クリップなら数秒で完了します)')
        try:
            result = subprocess.run(
                [
                    FFMPEG, '-i', latest_export,
                    '-c:v', 'libvpx-vp9',
                    '-crf', '33', '-b:v', '0',   # VP9 固定品質モード
                    '-c:a', 'libopus',
                    '-y', webm_path
                ],
                capture_output=True
            )
            if result.returncode == 0 and os.path.exists(webm_path):
                size_kb = os.path.getsize(webm_path) // 1024
                mp4_kb  = os.path.getsize(latest_export) // 1024
                saved   = round((1 - size_kb / mp4_kb) * 100) if mp4_kb else 0
                print(f'✅ WebM変換完了！ {mp4_kb}KB → {size_kb}KB（約{saved}%削減）')
                upload_target = webm_path
                upload_fname  = webm_fname
            else:
                err = result.stderr.decode('utf-8', errors='replace')[-300:]
                print(f'⚠️  WebM変換失敗（mp4のままアップロード）')
                print(f'   {err}')
                upload_target = latest_export
                upload_fname  = fname
        except Exception as ex:
            print(f'⚠️  WebM変換エラー（mp4のままアップロード）: {ex}')
            upload_target = latest_export
            upload_fname  = fname

        # ─── FTPアップロード ───
        url = upload_to_mixhost(upload_target, upload_fname)

        if url is None:
            print('\n⚠️  アップロードに失敗しました。次の動画に進みます。')
            cleanup_all(raw_path)
            return True

        print('\n' + '=' * 55)
        print('🎉 完了！管理画面に以下のURLを貼り付けてください:')
        print()
        print(f'  {url}')
        print()
        print('  ※ 管理画面の開始・終了時間は空欄でOKです')
        print('=' * 55)

        # ─── クリーンアップ（export/ + 元動画） ───
        cleanup_all(raw_path)

    except KeyboardInterrupt:
        print('\n\n⚠️  Ctrl+C で中断されました。クリーンアップします...')
        cleanup_all(raw_path if 'raw_path' in dir() else None)
        return False

    except Exception as e:
        print(f'\n❌ エラーが発生しました: {e}')
        cleanup_all(raw_path if 'raw_path' in dir() else None)

    return True


def main():
    print('🎬 X動画アップロードツール（終了: q または Ctrl+C）')

    try:
        while True:
            try:
                x_url = input('\n📌 X（Twitter）の投稿URLを入力してください:\n> ').strip()
            except KeyboardInterrupt:
                break

            if not x_url or x_url.lower() == 'q':
                break

            if not upload_one(x_url):
                break
    except KeyboardInterrupt:
        pass

    print('\n👋 終了しました。')


if __name__ == '__main__':
    main()
