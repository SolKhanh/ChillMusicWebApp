package com.chillscape.model;

public class Background {
    private int id;
    private String name;
    private boolean isAnimated;

    public Background(int id, String name, boolean isAnimated) {
        this.id = id;
        this.name = name;
        this.isAnimated = isAnimated;
    }

    public Background() {
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isAnimated() {
        return isAnimated;
    }

    public void setAnimated(boolean animated) {
        isAnimated = animated;
    }
}
