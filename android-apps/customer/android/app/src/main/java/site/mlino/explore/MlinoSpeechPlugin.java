package site.mlino.explore;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * Speech to text with the phone's own recogniser. The app's web view has no working speech API, so the page asks
 * this plugin instead; it answers with the same events the browser API would give (partial, result, error, end).
 * The microphone is used only while the person holds the conversation open, after Android's own permission prompt.
 */
@CapacitorPlugin(
    name = "MlinoSpeech",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class MlinoSpeechPlugin extends Plugin {
    private SpeechRecognizer recognizer;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "afterPermission");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
        else call.reject("not-allowed");
    }

    private void begin(PluginCall call) {
        final String lang = call.getString("lang", "fa-IR");
        final boolean partial = Boolean.TRUE.equals(call.getBoolean("interimResults", true));
        getActivity().runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { call.reject("service-not-allowed"); return; }
            release();
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) { notifyListeners("ready", new JSObject()); }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onError(int error) {
                    JSObject e = new JSObject();
                    e.put("error", errorCode(error));
                    notifyListeners("error", e);
                    notifyListeners("end", new JSObject());
                }
                @Override public void onResults(Bundle results) { emit("result", results); notifyListeners("end", new JSObject()); }
                @Override public void onPartialResults(Bundle results) { emit("partial", results); }
                @Override public void onEvent(int eventType, Bundle params) {}
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, partial);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(intent);
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (recognizer != null) recognizer.stopListening(); call.resolve(); });
    }

    @PluginMethod
    public void abort(PluginCall call) {
        getActivity().runOnUiThread(() -> { release(); call.resolve(); });
    }

    @Override
    protected void handleOnDestroy() { release(); }

    private void release() {
        if (recognizer != null) { recognizer.destroy(); recognizer = null; }
    }

    private void emit(String event, Bundle results) {
        ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        JSObject r = new JSObject();
        r.put("text", list != null && !list.isEmpty() ? list.get(0) : "");
        notifyListeners(event, r);
    }

    /** The browser API's error names, so the page shows the same messages everywhere. */
    private static String errorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH: case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "no-speech";
            case SpeechRecognizer.ERROR_AUDIO: return "audio-capture";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "not-allowed";
            case SpeechRecognizer.ERROR_NETWORK: case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: case SpeechRecognizer.ERROR_SERVER: return "network";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED: case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE: return "language-not-supported";
            case SpeechRecognizer.ERROR_CLIENT: return "aborted";
            default: return "service-not-allowed";
        }
    }
}
