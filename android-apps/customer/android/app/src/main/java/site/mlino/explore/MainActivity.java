package site.mlino.explore;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MlinoLocationPlugin.class);
        registerPlugin(MlinoSpeechPlugin.class);
        super.onCreate(savedInstanceState);

        // The phone's back button first asks the page to close whatever is open (a business, a message, a sheet);
        // only when nothing is open does the app go to the background, like other apps.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge == null || bridge.getWebView() == null) { moveTaskToBack(true); return; }
                bridge.getWebView().evaluateJavascript(
                    "(function(){try{return typeof window.__mlinoBack==='function'&&window.__mlinoBack()===true}catch(e){return false}})()",
                    (handled) -> { if (!"true".equals(handled)) moveTaskToBack(true); });
            }
        });
    }
}
