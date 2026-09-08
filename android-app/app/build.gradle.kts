plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val generatedLauncherResDir = layout.buildDirectory.dir("generated/rainbow-launcher/res")
val generatedLauncherDrawableDir = layout.buildDirectory.dir("generated/rainbow-launcher/res/drawable")

val generateRainbowLauncherIcon by tasks.registering(Copy::class) {
    from(rootProject.file("../assets/images/rainbowpk.png"))
    into(generatedLauncherDrawableDir)
    rename { "rainbow_icon.png" }
}

android {
    namespace = "io.github.scionhyperion.rainbow"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.scionhyperion.rainbow"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.2.1"
    }

    sourceSets["main"].res.srcDir(generatedLauncherResDir)

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.named("preBuild").configure {
    dependsOn(generateRainbowLauncherIcon)
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
}
