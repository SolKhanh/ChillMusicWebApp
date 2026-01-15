package com.chillscape.controller;


import com.chillscape.dao.BackgroundDAO;
import com.chillscape.model.Background;
import com.google.gson.Gson;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.ResourceBundle;

@WebServlet("/api/backgrounds")
public class BackgroundServlet extends HttpServlet {
    private BackgroundDAO backgroundDAO;
    private Gson gson;

    @Override
    public void init() {
        backgroundDAO = new BackgroundDAO();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        ResourceBundle bundle = ResourceBundle.getBundle("messages");

        try {
            List<Background> backgrounds = backgroundDAO.getDefaultBackgrounds();
            String json = gson.toJson(backgrounds);
            resp.getWriter().write(json);
            resp.flushBuffer();
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            String errorMsg = bundle.getString("error.fetch.backgrounds");
            resp.getWriter().write("{\"error\": \"" + errorMsg + "\"}");
            e.printStackTrace();
        }
    }
}
