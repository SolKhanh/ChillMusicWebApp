package com.chillscape.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ResourceBundle;

public class DBConnection {
    private static final String URL = "jdbc:mysql://localhost:3306/chillscape_db?useSSL=false&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=UTF-8";
    private static final String USER = System.getProperty("DB_USER");
    private static final String PASSWORD = System.getProperty("DB_PASSWORD");
    private static final ResourceBundle bundle = ResourceBundle.getBundle("messages");
    public static Connection getConnection() {
        Connection connection = null;
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            connection = DriverManager.getConnection(URL, USER, PASSWORD);
        } catch (ClassNotFoundException e) {
            String errMsg = bundle.getString("error.db.driver");
            System.err.println(errMsg);
            e.printStackTrace();
        } catch (SQLException e) {
            String errMsg = bundle.getString("error.db.connect");
            System.err.println(errMsg);
            e.printStackTrace();
        }
        return connection;
    }

    // test
    public static void main(String[] args) {
        Connection conn = getConnection();
        if (conn != null) {
            System.out.println("Kết nối thành công tới Database 'chillscape_db'");
            try {
                conn.close();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        } else {
            System.out.println("Kết nối thất bại");
        }
    }
}