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

@WebServlet("/api/upload/*")
@MultipartConfig(
        fileSizeThreshold = 1024 * 1024 * 2, // 2MB
        maxFileSize = 1024 * 1024 * 50,      // 50MB
        maxRequestSize = 1024 * 1024 * 60    // 60MB
)
public class UploadServlet extends HttpServlet {
    private static final String BACKGROUND_DIR = "assets/img/backgrounds";
    private static final String SONG_DIR = "assets/audio/songs";
    private static final String COVER_DIR = "assets/img/covers";

    private final BackgroundDAO backgroundDAO = new BackgroundDAO();
    private final SongDAO songDAO = new SongDAO();
    private final Gson gson = new Gson();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        req.setCharacterEncoding("UTF-8");

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

        String pathInfo = req.getPathInfo();
        try {
            if ("/background".equals(pathInfo)) handleUploadBackground(req, responseData);
            else if ("/song".equals(pathInfo)) handleUploadSong(req, responseData);
            else {
                resp.setStatus(404);
                responseData.put("message", LanguageUtil.getMessage(req, "error.endpoint.not_found"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(500);
            String msg = e.getMessage() != null ? e.getMessage() : LanguageUtil.getMessage(req, "error.upload.failed");
            responseData.put("message", msg);
        }

        out.print(gson.toJson(responseData));
        out.flush();
    }

    private void handleUploadBackground(HttpServletRequest req, Map<String, Object> responseData) throws IOException, ServletException {

        String collectionIdStr = req.getParameter("collectionId");
        Part filePart = req.getPart("file");
        String savedFileName = saveFile(req, filePart, BACKGROUND_DIR);
        int newBgId = backgroundDAO.insertBackground(savedFileName, false);

        if (newBgId != -1) {
            int colId = Integer.parseInt(collectionIdStr);
            backgroundDAO.addBackgroundToCollection(colId, newBgId);
            responseData.put("status", "success");
            responseData.put("message", LanguageUtil.getMessage(req, "upload.success"));
            responseData.put("fileName", savedFileName);
        } else {
            throw new IOException(LanguageUtil.getMessage(req, "error.db.save"));
        }
    }

    private void handleUploadSong(HttpServletRequest req, Map<String, Object> responseData) throws IOException, ServletException {
        String collectionIdStr = req.getParameter("collectionId");
        if (collectionIdStr == null) throw new IOException(LanguageUtil.getMessage(req, "error.upload.missing_id"));

        Part songPart = req.getPart("file");
        Part coverPart = req.getPart("cover");

        String title = req.getParameter("title");
        String artist = req.getParameter("artist");

        if (title == null || title.trim().isEmpty()) title = "Unknown Title";

        // Save Audio
        String savedSongName = saveFile(req, songPart, SONG_DIR);
        String dbSongPath = SONG_DIR + "/" + savedSongName;

        // Save Cover
        String dbCoverPath = null;
        if (coverPart != null && coverPart.getSize() > 0) {
            String savedCoverName = saveFile(req, coverPart, COVER_DIR);
            dbCoverPath = COVER_DIR + "/" + savedCoverName;
        }

        // Insert DB
        int newSongId = songDAO.insertSong(title, artist, dbSongPath, dbCoverPath);

        if (newSongId != -1) {
            int colId = Integer.parseInt(collectionIdStr);
            boolean linked = songDAO.addSongToCollection(colId, newSongId);
            if (linked) {
                responseData.put("status", "success");
                responseData.put("message", LanguageUtil.getMessage(req, "upload.success"));
                responseData.put("filePath", dbSongPath);
                responseData.put("id", newSongId);
            } else {
                throw new IOException(LanguageUtil.getMessage(req, "error.upload.link_failed"));
            }
        } else {
            throw new IOException(LanguageUtil.getMessage(req, "error.db.save"));
        }
    }

    private boolean isValidExtension(String filename, String type) {
        String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        if ("audio".equals(type)) {
            return ext.equals("mp3") || ext.equals("wav") || ext.equals("ogg");
        } else if ("image".equals(type)) {
            return ext.equals("jpg") || ext.equals("jpeg") || ext.equals("png") || ext.equals("gif");
        }
        return false;
    }

    private String saveFile(HttpServletRequest req, Part part, String targetDir) throws IOException {
        String submittedFileName = part.getSubmittedFileName();
        if (submittedFileName == null || submittedFileName.isEmpty())
            throw new IOException(LanguageUtil.getMessage(req, "error.file.name.empty"));

        // --- SECURITY CHECK ---
        String type = targetDir.contains("audio") ? "audio" : "image";
        if (!isValidExtension(submittedFileName, type))
            throw new IOException(LanguageUtil.getMessage(req, "error.file.invalid_format"));

        String safeFileName = submittedFileName.replaceAll("\\s+", "_");
        String uniqueFileName = java.util.UUID.randomUUID().toString() + "_" + safeFileName;
        String applicationPath = req.getServletContext().getRealPath("");
        String uploadFilePath = applicationPath + File.separator + targetDir;

        File fileSaveDir = new File(uploadFilePath);
        if (!fileSaveDir.exists()) fileSaveDir.mkdirs();

        part.write(uploadFilePath + File.separator + uniqueFileName);
        return uniqueFileName;
    }
}