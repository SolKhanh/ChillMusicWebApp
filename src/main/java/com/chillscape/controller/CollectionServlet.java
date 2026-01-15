package com.chillscape.controller;

import com.chillscape.dao.BackgroundDAO;
import com.chillscape.dao.CollectionDAO;
import com.chillscape.dao.SongDAO;
import com.chillscape.utils.LanguageUtil;
import com.google.gson.Gson;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
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
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            resp.setStatus(401);
            responseData.put("message", LanguageUtil.getMessage(req, "auth.required"));
            out.print(gson.toJson(responseData));
            return;
        }

        int userId = (int) session.getAttribute("userId");

        try {
            List<Map<String, Object>> myCols = collectionDAO.getMyCollections(userId);
            List<Map<String, Object>> followedCols = collectionDAO.getFollowedCollections(userId);

            // Populate items
            for (Map<String, Object> col : myCols) populateCollectionItems(col);
            for (Map<String, Object> col : followedCols) populateCollectionItems(col);

            responseData.put("status", "success");
            responseData.put("myCollections", myCols);
            responseData.put("followedCollections", followedCols);
        } catch (Exception e) {
            e.printStackTrace();
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "error.unknown"));
        }
        out.print(gson.toJson(responseData));
    }

    private void populateCollectionItems(Map<String, Object> collection) {
        int colId = (int) collection.get("id");
        collection.put("songs", songDAO.getSongsByCollectionId(colId));
        collection.put("backgrounds", backgroundDAO.getBackgroundsByCollectionId(colId));
    }

    // Tạo mới / Follow
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8"); // Đảm bảo hứng tên Collection tiếng Việt đúng

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            resp.setStatus(401);
            responseData.put("message", LanguageUtil.getMessage(req, "auth.required"));
            out.print(gson.toJson(responseData));
            return;
        }
        int userId = (int) session.getAttribute("userId");
        String pathInfo = req.getPathInfo();

        if ("/create".equals(pathInfo)) {
            String name = req.getParameter("name");
            if (name == null || name.trim().isEmpty()) {
                responseData.put("message", LanguageUtil.getMessage(req, "collection.create.name_required"));
                out.print(gson.toJson(responseData));
                return;
            }
            if (collectionDAO.createCollection(userId, name)) {
                responseData.put("status", "success");
                responseData.put("message", LanguageUtil.getMessage(req, "collection.create.success"));
            } else {
                responseData.put("message", LanguageUtil.getMessage(req, "collection.create.fail"));
            }
        } else if ("/follow".equals(pathInfo)) {
            String code = req.getParameter("shareCode");
            if (code == null || code.trim().isEmpty()) {
                responseData.put("message", LanguageUtil.getMessage(req, "collection.follow.code_required"));
                out.print(gson.toJson(responseData));
                return;
            }
            if (collectionDAO.subscribeCollection(userId, code)) {
                responseData.put("status", "success");
                responseData.put("message", LanguageUtil.getMessage(req, "collection.follow.success"));
            } else {
                responseData.put("message", LanguageUtil.getMessage(req, "collection.follow.fail"));
            }
        } else {
            resp.setStatus(404);
            responseData.put("message", LanguageUtil.getMessage(req, "error.endpoint.not_found"));
        }
        out.print(gson.toJson(responseData));
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            resp.setStatus(401);
            // Trả về JSON lỗi 401 chuẩn
            responseData.put("message", LanguageUtil.getMessage(req, "auth.required"));
            out.print(gson.toJson(responseData));
            return;
        }

        int userId = (int) session.getAttribute("userId");
        String role = (String) session.getAttribute("role");
        String pathInfo = req.getPathInfo();

        try {
            // PathInfo expected: /delete/type/colId/itemId
            if (pathInfo == null) throw new IllegalArgumentException();
            String[] parts = pathInfo.split("/");

            //  Kiểm tra độ dài path
            if (parts.length < 5) {
                throw new IllegalArgumentException(LanguageUtil.getMessage(req, "error.path.invalid"));
            }

            String action = parts[1]; // "delete"
            if (!"delete".equals(action)) {
                resp.setStatus(404);
                responseData.put("message", LanguageUtil.getMessage(req, "error.endpoint.not_found"));
                out.print(gson.toJson(responseData));
                return;
            }

            String type = parts[2]; // "song" or "background"
            int colId = Integer.parseInt(parts[3]);
            int itemId = Integer.parseInt(parts[4]);

            //  Admin được xóa tất cả, User chỉ xóa của mình
            boolean isOwner = collectionDAO.isCollectionOwner(userId, colId);
            boolean isAdmin = role != null && "ADMIN".equals(role);

            if (!isOwner && !isAdmin) {
                resp.setStatus(403);
                responseData.put("message", LanguageUtil.getMessage(req, "delete.permission_denied"));
            } else {
                boolean success = false;
                if ("song".equals(type)) {
                    success = collectionDAO.removeSongFromCollection(colId, itemId);
                } else if ("background".equals(type)) {
                    success = collectionDAO.removeBackgroundFromCollection(colId, itemId);
                }

                if (success) {
                    responseData.put("status", "success");
                    responseData.put("message", LanguageUtil.getMessage(req, "delete.success"));
                } else {
                    responseData.put("message", LanguageUtil.getMessage(req, "delete.fail"));
                }
            }
        } catch (NumberFormatException e) {
            responseData.put("message", LanguageUtil.getMessage(req, "error.format.invalid_id"));
        } catch (IllegalArgumentException e) {
            responseData.put("message", e.getMessage() != null ? e.getMessage() : LanguageUtil.getMessage(req, "error.path.invalid"));
        } catch (Exception e) {
            e.printStackTrace();
            responseData.put("message", LanguageUtil.getMessage(req, "error.unknown"));
        }
        out.print(gson.toJson(responseData));
    }
}