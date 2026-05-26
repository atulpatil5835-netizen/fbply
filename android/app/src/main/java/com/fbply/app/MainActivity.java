package com.fbply.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Window window = getWindow();
    window.setStatusBarColor(Color.parseColor("#0B1020"));
    window.setNavigationBarColor(Color.parseColor("#0B1020"));
  }
}
