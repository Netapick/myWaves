package com.mywaves.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Télécharge l'APK de mise à jour et lance son installation, sans passer par le
 * navigateur/gestionnaire de téléchargements système (myWaves n'étant pas distribuée
 * sur le Play Store, il n'existe pas d'équivalent natif — voir useAppUpdate.ts).
 */
@CapacitorPlugin(name = "ApkUpdater")
public class UpdaterPlugin extends Plugin {

    private static final String UPDATE_FILENAME = "update.apk";
    private static final long POLL_INTERVAL_MS = 400;

    private final Handler handler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url manquant");
            return;
        }

        Context context = getContext();
        File destFile = new File(context.getExternalFilesDir(null), UPDATE_FILENAME);
        // DownloadManager refuse d'écrire si le fichier d'une tentative précédente existe déjà.
        if (destFile.exists()) {
            destFile.delete();
        }

        DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setDestinationInExternalFilesDir(context, null, UPDATE_FILENAME);
        // Progression affichée dans l'app (UpdateBanner) : pas besoin de la notification système.
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_HIDDEN);
        request.setTitle("myWaves — mise à jour");

        long downloadId = downloadManager.enqueue(request);
        call.setKeepAlive(true);
        pollProgress(call, downloadManager, downloadId, destFile);
    }

    private void pollProgress(PluginCall call, DownloadManager downloadManager, long downloadId, File destFile) {
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = downloadManager.query(query)) {
            if (!cursor.moveToFirst()) {
                handler.postDelayed(() -> pollProgress(call, downloadManager, downloadId, destFile), POLL_INTERVAL_MS);
                return;
            }

            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                installApk(call, destFile);
                return;
            }
            if (status == DownloadManager.STATUS_FAILED) {
                call.reject("Échec du téléchargement de la mise à jour");
                return;
            }

            long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            if (total > 0) {
                JSObject ret = new JSObject();
                ret.put("percent", (int) (downloaded * 100 / total));
                notifyListeners("downloadProgress", ret);
            }
            handler.postDelayed(() -> pollProgress(call, downloadManager, downloadId, destFile), POLL_INTERVAL_MS);
        }
    }

    private void installApk(PluginCall call, File apkFile) {
        Context context = getContext();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageManager packageManager = context.getPackageManager();
            if (!packageManager.canRequestPackageInstalls()) {
                Intent settingsIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + context.getPackageName())
                );
                settingsIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(settingsIntent);
                call.reject("Autorisation d'installation requise", "INSTALL_PERMISSION_REQUIRED");
                return;
            }
        }

        Uri apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apkFile);
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        context.startActivity(installIntent);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        handler.removeCallbacksAndMessages(null);
    }
}
