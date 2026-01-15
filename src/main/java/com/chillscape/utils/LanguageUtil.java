package com.chillscape.utils;

import javax.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
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
            // ResourceBundle tự động tìm file messages_vi.properties hoặc messages_en.properties
            ResourceBundle bundle = ResourceBundle.getBundle("messages", locale);
            //encoding ISO-8859-1 sang UTF-8 để tránh lỗi font
            String val = bundle.getString(key);
            return new String(val.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "???" + key + "???"; // Trả về key nếu không tìm thấy
        }
    }
}
