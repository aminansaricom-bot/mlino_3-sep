package site.mlino.explore;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Location permission for the on-device nearby-offer check (D-77, D-79). Android asks for «while using» and
 * «all the time» in two separate steps; this plugin walks the member through both, only when they turn the
 * alerts on. The position itself is read by the background task on the phone and never sent anywhere.
 */
@CapacitorPlugin(
    name = "MlinoLocation",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }),
        @Permission(alias = "background", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class MlinoLocationPlugin extends Plugin {

    private JSObject state() {
        JSObject r = new JSObject();
        r.put("location", getPermissionState("location") == PermissionState.GRANTED);
        r.put("background", Build.VERSION.SDK_INT < 29 || getPermissionState("background") == PermissionState.GRANTED);
        r.put("notifications", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
        return r;
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(state()); }

    /** Step 1: notifications (Android 13+). Step 2: location while in use. Step 3: all the time (Android 10+). */
    @PluginMethod
    public void request(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "afterStep");
        } else if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "afterStep");
        } else if (Build.VERSION.SDK_INT >= 29 && getPermissionState("background") != PermissionState.GRANTED) {
            requestPermissionForAlias("background", call, "afterStep");
        } else {
            call.resolve(state());
        }
    }

    @PermissionCallback
    private void afterStep(PluginCall call) {
        JSObject s = state();
        boolean notifications = s.getBool("notifications");
        boolean location = s.getBool("location");
        // Continue to the next step only if the member said yes to this one.
        if (notifications && location && !s.getBool("background") && Build.VERSION.SDK_INT >= 29 && getPermissionState("background") == PermissionState.PROMPT) {
            requestPermissionForAlias("background", call, "afterStep");
            return;
        }
        if (notifications && !location && getPermissionState("location") == PermissionState.PROMPT) {
            requestPermissionForAlias("location", call, "afterStep");
            return;
        }
        call.resolve(s);
    }

    /** Opens this app's settings page, where «all the time» can be chosen if Android no longer asks. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
