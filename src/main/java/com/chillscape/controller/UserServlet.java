package com.chillscape.controller;

import com.chillscape.dao.UserDAO;
import com.chillscape.model.User;
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
import java.util.Map;

@WebServlet("/api/auth/*")
public class UserServlet extends HttpServlet {

    private final UserDAO userDAO = new UserDAO();
    private final Gson gson = new Gson();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();

        // Cấu hình UTF-8 và JSON
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        if (pathInfo == null) {
            resp.setStatus(404);
            return;
        }

        switch (pathInfo) {
            case "/login":
                handleLogin(req, resp);
                break;
            case "/logout":
                handleLogout(req, resp);
                break;
            case "/register":
                handleRegister(req, resp);
                break;
            default:
                resp.setStatus(404);
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        if ("/check".equals(pathInfo)) {
            handleCheckSession(req, resp);
        } else {
            resp.setStatus(404);
        }
    }

    private void handleCheckSession(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        if (session != null && session.getAttribute("userId") != null) {
            // Còn session -> Trả về thông tin User
            responseData.put("status", "success");
            responseData.put("userId", session.getAttribute("userId"));
            responseData.put("username", session.getAttribute("username"));
            responseData.put("role", session.getAttribute("role"));
        } else {

            resp.setStatus(401);
            responseData.put("status", "error");
            responseData.put("message", "No session found");
        }

        out.print(gson.toJson(responseData));
        out.flush();
    }

    private void handleLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        User user = userDAO.login(username, password);

        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        if (user != null) {
            //  Session
            HttpSession session = req.getSession(true);
            session.setAttribute("userId", user.getId());
            session.setAttribute("role", user.getRole());
            session.setAttribute("username", user.getUsername());

            String msg = LanguageUtil.getMessage(req, "auth.login.success");

            // dữ liệu trả về
            responseData.put("status", "success");
            responseData.put("message", msg);
            responseData.put("userId", user.getId());
            responseData.put("username", user.getUsername());
            responseData.put("sessionID", session.getId());
        } else {
            resp.setStatus(401);
            String msg = LanguageUtil.getMessage(req, "auth.login.fail");
            responseData.put("status", "error");
            responseData.put("message", msg);
        }

        // Trả về JSON
        out.print(new Gson().toJson(responseData));
        out.flush();
    }

    private void handleLogout(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("status", "success");
        responseData.put("message", LanguageUtil.getMessage(req, "auth.logout.success"));

        resp.getWriter().print(gson.toJson(responseData));
    }

    private void handleRegister(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        PrintWriter out = resp.getWriter();
        Map<String, Object> responseData = new HashMap<>();

        if (username == null || password == null) {
            resp.setStatus(400);
            responseData.put("status", "error");
            responseData.put("message", LanguageUtil.getMessage(req, "auth.register.invalid"));
            out.print(gson.toJson(responseData));
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(password);
        user.setRole("USER");

        boolean isRegisterd = userDAO.register(user);
        if (isRegisterd) {
            String msg = LanguageUtil.getMessage(req, "auth.register.success");
            responseData.put("status", "success");
            responseData.put("message", msg);

        } else {
            resp.setStatus(HttpServletResponse.SC_CONFLICT);

            String msg = LanguageUtil.getMessage(req, "auth.register.fail");
            responseData.put("status", "error");
            responseData.put("message", msg);
        }
        out.print(gson.toJson(responseData));
    }
}