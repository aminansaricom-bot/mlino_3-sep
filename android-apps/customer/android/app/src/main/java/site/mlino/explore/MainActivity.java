package site.mlino.explore;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MlinoLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
