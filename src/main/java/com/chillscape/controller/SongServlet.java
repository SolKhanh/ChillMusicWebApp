package com.chillscape.controller;

import com.chillscape.dao.SongDAO;
import com.chillscape.model.Song;
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

@WebServlet("/api/songs")
public class SongServlet extends HttpServlet {
    private SongDAO songDAO;
    private Gson gson;

    @Override
    public void init() {
        songDAO = new SongDAO();
        gson = new Gson();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        // Thiết lập header trả về JSON và hỗ trợ tiếng Việt (UTF-8)
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        ResourceBundle bundle = ResourceBundle.getBundle("messages");
        try {
            List<Song> songs = songDAO.getDefaultSongs();
            String json = gson.toJson(songs);

            PrintWriter out = resp.getWriter();
            out.print(json);
            out.flush();
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            String errorMsg = bundle.getString("error.fetch.songs");
            resp.getWriter().write("{\"error\": \"" + errorMsg + "\"}");
            e.printStackTrace();
        }
    }
}