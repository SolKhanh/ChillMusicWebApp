package com.chillscape.dao;

import com.chillscape.db.DBConnection;
import com.chillscape.model.Song;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    public List<Song> getDefaultSongs() {
        List<Song> songs = new ArrayList<>();
        String sql = "SELECT s.* FROM songs s JOIN collections_songs cs ON s.id = cs.song_id JOIN collections c ON cs.collection_id = c.id WHERE c.user_id = 1";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Song song = new Song();
                song.setId(rs.getInt("id"));
                song.setTitle(rs.getString("title"));
                song.setArtist(rs.getString("artist"));
                song.setFilePath(rs.getString("file_path"));
                song.setCoverImage(rs.getString("cover_image"));
                songs.add(song);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return songs;
    }

    public int insertSong(String title, String artist, String filePath, String coverImage) {
        String sql = "INSERT INTO songs (title, artist, file_path, cover_image) VALUES (?, ?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, title);
            ps.setString(2, (artist != null && !artist.isEmpty()) ? artist : "Unknown Artist");
            ps.setString(3, filePath);
            ps.setString(4, coverImage); // Có thể null

            int affectedRows = ps.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        return rs.getInt(1);
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return -1;
    }

    public boolean addSongToCollection(int collectionId, int songId) {
        String sql = "INSERT INTO collections_songs (collection_id, song_id) VALUES (?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, collectionId);
            ps.setInt(2, songId);
            return ps.executeUpdate() > 0;

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public List<Map<String, Object>> getSongsByCollectionId(int collectionId) {
        List<Map<String, Object>> songs = new ArrayList<>();
        String sql = "SELECT s.* FROM songs s " +
                "JOIN collections_songs cs ON s.id = cs.song_id " +
                "WHERE cs.collection_id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, collectionId);
            ResultSet rs = ps.executeQuery();

            while (rs.next()) {
                Map<String, Object> song = new HashMap<>();
                song.put("id", rs.getInt("id"));
                song.put("title", rs.getString("title"));
                song.put("artist", rs.getString("artist"));
                song.put("filePath", rs.getString("file_path"));
                song.put("cover", rs.getString("cover_image"));
                songs.add(song);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return songs;
    }
}