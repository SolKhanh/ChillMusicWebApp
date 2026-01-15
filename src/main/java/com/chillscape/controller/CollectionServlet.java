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
        req.setCharacterEncoding("UTF-8");

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            resp.setStatus(401);
            out.print(gson.toJson(responseData));
            return;
        }
        int userId = (int) session.getAttribute("userId");
        String pathInfo = req.getPathInfo();

        if ("/create".equals(pathInfo)) {
            String name = req.getParameter("name");
            if (collectionDAO.createCollection(userId, name)) {
                responseData.put("status", "success");
            } else {
                responseData.put("message", "Create failed");
            }
        } else if ("/follow".equals(pathInfo)) {
            String code = req.getParameter("shareCode");
            if (collectionDAO.subscribeCollection(userId, code)) {
                responseData.put("status", "success");
            } else {
                responseData.put("message", "Invalid code or already followed");
            }
        }
        out.print(gson.toJson(responseData));
    }

    //  Xóa bài hát/ảnh khỏi Collection
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            resp.setStatus(401);
            return;
        }

        int userId = (int) session.getAttribute("userId");
        String role = (String) session.getAttribute("role");
        String pathInfo = req.getPathInfo(); // VD: /delete/background/5/12

        try {
            // PathInfo: /delete/type/colId/itemId
            // split("/"): ["", "delete", "type", "colId", "itemId"]
            String[] parts = pathInfo.split("/");

            //  lấy tham số từ URL
            if (parts.length < 5) throw new IllegalArgumentException("Invalid path format");

            String action = parts[1]; // "delete"
            if (!"delete".equals(action)) {
                resp.setStatus(404);
                return;
            }

            String type = parts[2]; // "song" or "background"
            int colId = Integer.parseInt(parts[3]);
            int itemId = Integer.parseInt(parts[4]);

            //  Admin được xóa tất cả, User chỉ xóa của mình
            boolean isOwner = collectionDAO.isCollectionOwner(userId, colId);
            boolean isAdmin = "ADMIN".equals(role);

            if (!isOwner && !isAdmin) {
                resp.setStatus(403);
                responseData.put("message", "Permission denied");
            } else {
                boolean success = false;
                if ("song".equals(type)) {
                    success = collectionDAO.removeSongFromCollection(colId, itemId);
                } else if ("background".equals(type)) {
                    success = collectionDAO.removeBackgroundFromCollection(colId, itemId);
                }

                if (success) responseData.put("status", "success");
                else responseData.put("message", "Delete failed (Item not found or DB error)");
            }
        } catch (NumberFormatException e) {
            responseData.put("message", "Invalid ID format");
        } catch (Exception e) {
            e.printStackTrace();
            responseData.put("message", e.getMessage());
        }
        out.print(gson.toJson(responseData));
    }
}