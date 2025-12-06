package com.chillscape.controller;

import com.chillscape.dao.SoundDAO;
import com.chillscape.model.Sound;
import com.google.gson.Gson;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.ResourceBundle;

@WebServlet("/api/sounds")
public class SoundServlet extends HttpServlet {
    private SoundDAO soundDAO;
    private Gson gson;

    @Override
    public void init() {
        soundDAO = new SoundDAO();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        ResourceBundle bundle = ResourceBundle.getBundle("messages");

        try {
            List<Sound> sounds = soundDAO.getAllSounds();
            String json = gson.toJson(sounds);

            PrintWriter out = resp.getWriter();
            out.print(json);
            out.flush();
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            String errorMsg = bundle.getString("error.fetch.sounds");
            resp.getWriter().write("{\"error\": \"" + errorMsg + "\"}");
            e.printStackTrace();
        }
    }
}