package com.chillscape.controller;

import com.chillscape.dao.BackgroundDAO;
import com.chillscape.dao.CollectionDAO;
import com.chillscape.dao.SongDAO;
import com.chillscape.utils.LanguageUtil;
import com.google.gson.Gson;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebServlet("/api/collections/*")
public class CollectionServlet extends HttpServlet {
    private static final CollectionDAO collectionDAO = new CollectionDAO();
    private static final SongDAO songDAO = new SongDAO();
    private static final BackgroundDAO backgroundDAO = new BackgroundDAO();
    private static final Gson gson = new Gson();

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

        if (pathInfo == null) {
            resp.setStatus(404);
            return;
        }

        // 2. Phân loại hành động
        switch (pathInfo) {
            case "/create":
                handleCreate(req, responseData, userId);
                break;
            case "/follow":
                handleFollow(req, responseData, userId);
                break;
            default:
                resp.setStatus(404);
                responseData.put("message", "Endpoint not found");
        }

        out.print(gson.toJson(responseData));
        out.flush();
    }

    // --- Xử lý tạo Collection (Của Owner) ---
    private void handleCreate(HttpServletRequest req, Map<String, Object> responseData, int userId) {
        String name = req.getParameter("name");

        if (name == null || name.trim().isEmpty()) {
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "collection.create.name_required"));
            return;
        }

        boolean success = collectionDAO.createCollection(userId, name);

        if (success) {
            responseData.put("status", "success");
            responseData.put("message", LanguageUtil.getMessage(req, "collection.create.success"));
        } else {
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "error.unknown"));
        }
    }

    // --- Xử lý theo dõi Collection (Của Subscriber) ---
    private void handleFollow(HttpServletRequest req, Map<String, Object> responseData, int userId) {
        String shareCode = req.getParameter("shareCode");

        if (shareCode == null || shareCode.trim().isEmpty()) {
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "collection.follow.code_required"));
            return;
        }

        // Gọi hàm DAO đã viết ở bước trước
        boolean success = collectionDAO.subscribeCollection(userId, shareCode);

        if (success) {
            responseData.put("status", "success");
            responseData.put("message", LanguageUtil.getMessage(req, "collection.follow.success"));
        } else {
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "collection.follow.fail"));
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
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
            if (pathInfo == null || pathInfo.equals("/")) {
                List<Map<String, Object>> myCols = collectionDAO.getMyCollections(userId);
                List<Map<String, Object>> followedCols = collectionDAO.getFollowedCollections(userId);

                for (Map<String, Object> collection : myCols) {
                    int colId = (int) collection.get("id");
                    collection.put("songs", songDAO.getSongsByCollectionId(colId));
                    collection.put("backgrounds", backgroundDAO.getBackgroundsByCollectionId(colId));
                }

                for (Map<String, Object> collection : followedCols) {
                    int colId = (int) collection.get("id"); // Lưu ý: key id phải khớp với DAO trả về
                    collection.put("songs", songDAO.getSongsByCollectionId(colId));
                    collection.put("backgrounds", backgroundDAO.getBackgroundsByCollectionId(colId));
                }

                responseData.put("status", "success");
                responseData.put("myCollections", myCols);
                responseData.put("followedCollections", followedCols);
            } else {
                resp.setStatus(404);
                responseData.put("message", "Not found");
            }
        } catch (Exception e) {
            resp.setStatus(500);
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "error.unknown"));
            e.printStackTrace();
        }

        out.print(gson.toJson(responseData));
        out.flush();
    }
}
