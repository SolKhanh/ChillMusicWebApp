package com.chillscape.utils;

import com.chillscape.dao.CollectionDAO;
import com.chillscape.dao.UserDAO;
import com.chillscape.model.User;

import java.sql.SQLException;

public class Main {

    public static void main(String[] args) throws SQLException {
        PasswordUtil passwordUtil = new PasswordUtil();

        String salt = PasswordUtil.getSalt();
        String hashedPassword = PasswordUtil.hashPassword("user1", salt);
        System.out.println(salt + "$" + hashedPassword);


    }
}
