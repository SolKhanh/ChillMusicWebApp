package com.chillscape.controller;

import com.chillscape.dao.BackgroundDAO;
import com.chillscape.dao.SongDAO;
import com.chillscape.utils.LanguageUtil;
import com.google.gson.Gson;

import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@WebServlet("/api/upload/*")
@MultipartConfig(
        fileSizeThreshold = 1024 * 1024 * 2, // 2MB
        maxFileSize = 1024 * 1024 * 50,      // 50MB
        maxRequestSize = 1024 * 1024 * 60    // 60MB
)
public class UploadServlet extends HttpServlet {
    private static final String BACKGROUND_DIR = "assets/img/backgrounds";
    private static final String SONG_DIR = "assets/audio/songs";

    private final BackgroundDAO backgroundDAO = new BackgroundDAO();
    private final SongDAO songDAO = new SongDAO();
    private final Gson gson = new Gson();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            resp.setStatus(401);
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "auth.required"));
            out.print(gson.toJson(responseData));
            return;
        }

        int userId = (int) session.getAttribute("userId");
        String pathInfo = req.getPathInfo();

        try {
            if ("/background".equals(pathInfo)) {
                handleUploadBackground(req, responseData);
            } else if ("/song".equals(pathInfo)) {
                handleUploadSong(req, responseData);
            } else {
                resp.setStatus(404);
                responseData.put("message", LanguageUtil.getMessage(req, "error.endpoint.not_found"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(500);
            responseData.put("message", LanguageUtil.getMessage(req, "error.upload.failed") + ": " + e.getMessage());
        }

        out.print(gson.toJson(responseData));
        out.flush();
    }

    private void handleUploadBackground(HttpServletRequest req, Map<String, Object> responseData) throws IOException, ServletException {
        String collectionIdStr = req.getParameter("collectionId");
        if (collectionIdStr == null || collectionIdStr.isEmpty()) {
            throw new IOException("Missing collectionId. Cannot upload orphan file.");
        }

        Part filePart = req.getPart("file");
        String savedFileName = saveFile(req, filePart, BACKGROUND_DIR);

        int newBgId = backgroundDAO.insertBackground(savedFileName, false);

        if (newBgId != -1) {
            try {
                int colId = Integer.parseInt(collectionIdStr);
                boolean linked = backgroundDAO.addBackgroundToCollection(colId, newBgId);

                if (linked) {
                    responseData.put("status", "success");
                    responseData.put("message", LanguageUtil.getMessage(req, "upload.success"));
                    responseData.put("fileName", savedFileName);
                    responseData.put("id", newBgId);
                } else {
                    throw new IOException("Failed to link background to collection.");
                }
            } catch (NumberFormatException e) {
                throw new IOException("Invalid collection ID");
            }
        } else {
            throw new IOException(LanguageUtil.getMessage(req, "error.upload.failed"));
        }
    }

    private void handleUploadSong(HttpServletRequest req, Map<String, Object> responseData) throws IOException, ServletException {
        String collectionIdStr = req.getParameter("collectionId");
        if (collectionIdStr == null || collectionIdStr.isEmpty()) {
            throw new IOException("Missing collectionId. Cannot upload orphan file.");
        }

        Part filePart = req.getPart("file");
        String title = req.getParameter("title");
        String artist = req.getParameter("artist");

        if (title == null || title.trim().isEmpty()) title = "Unknown Title";

        String savedFileName = saveFile(req, filePart, SONG_DIR);
        String dbFilePath = SONG_DIR + "/" + savedFileName;

        int newSongId = songDAO.insertSong(title, artist, dbFilePath, null);

        if (newSongId != -1) {
            try {
                int colId = Integer.parseInt(collectionIdStr);
                boolean linked = songDAO.addSongToCollection(colId, newSongId);

                if (linked) {
                    responseData.put("status", "success");
                    responseData.put("message", LanguageUtil.getMessage(req, "upload.success"));
                    responseData.put("fileName", savedFileName);
                    responseData.put("filePath", dbFilePath);
                    responseData.put("id", newSongId);
                } else {
                    throw new IOException("Failed to link song to collection.");
                }
            } catch (NumberFormatException e) {
                throw new IOException("Invalid collection ID");
            }
        } else {
            // Dùng LanguageUtil
            throw new IOException(LanguageUtil.getMessage(req, "error.upload.failed"));
        }
    }

    private String saveFile(HttpServletRequest req, Part part, String targetDir) throws IOException {
        String submittedFileName = part.getSubmittedFileName();
        if (submittedFileName == null || submittedFileName.isEmpty()) {
            throw new IOException(LanguageUtil.getMessage(req, "error.file.name.empty"));
        }

        String safeFileName = submittedFileName.replaceAll("\\s+", "_");
        String uniqueFileName = UUID.randomUUID().toString() + "_" + safeFileName;

        String applicationPath = req.getServletContext().getRealPath("");
        String uploadFilePath = applicationPath + File.separator + targetDir;

        File fileSaveDir = new File(uploadFilePath);
        if (!fileSaveDir.exists()) {
            if (!fileSaveDir.mkdirs()) {
                throw new IOException(LanguageUtil.getMessage(req, "error.file.dir.create"));
            }
        }

        part.write(uploadFilePath + File.separator + uniqueFileName);
        return uniqueFileName;
    }
}