package com.chillscape.dao;

import com.chillscape.db.DBConnection;
import com.chillscape.model.Song;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SongDAO {

    public List<Song> getAllSongs() {
        List<Song> songs = new ArrayList<>();
        String sql = "SELECT id, title, artist, file_path, cover_image FROM songs";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Song song = new Song();
                song.setId(rs.getInt("id"));
                song.setTitle(rs.getString("title"));
                song.setArtist(rs.getString("artist"));
                song.setFilePath(rs.getString("file_path"));
                song.setCoverImage(rs.getString("cover_image"));
                songs.add(song);
            }

        } catch (SQLException e) {
            System.err.println("Error fetching songs: " + e.getMessage());
            e.printStackTrace();
        }
        return songs;
    }
}