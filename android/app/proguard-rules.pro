# Proguard rules for Taqareer Network App (WebView / Capacitor production build)

# Preserve JavascriptInterface annotations and methods to avoid crashing bridge
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebKit and WebView classes
-keep class android.webkit.** { *; }
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
}
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(...);
}

# Keep AndroidX and Material Components
-keep class androidx.appcompat.** { *; }
-keep class com.google.android.material.** { *; }
-keep class androidx.swiperefreshlayout.** { *; }
-keep class androidx.constraintlayout.** { *; }

# For Google Play release stability
-dontwarn okio.**
-dontwarn javax.annotation.**
