package com.chillscape.utils;

import javax.servlet.http.HttpServletRequest;
import java.util.Locale;
import java.util.ResourceBundle;

public class LanguageUtil {

    // Tên file gốc (base name)
    private static final String messages = "messages";

    public static String getMessage(HttpServletRequest req, String key) {
        Locale locale = req.getLocale();

        String langParam = req.getParameter("lang");
        if (langParam != null && langParam.equals("en")) {
            locale = new Locale("en", "GB");
        } else if (langParam != null && langParam.equals("vi")) {
            locale = new Locale("vi", "VN");
        }

        try {
            ResourceBundle bundle = ResourceBundle.getBundle(messages, locale);
            return bundle.getString(key);
        } catch (Exception e) {
            return "???" + key + "???";
        }
    }
}