CREATE TABLE settings (
    name  VARCHAR NOT NULL,
    date  DATE    NOT NULL,
    value NUMERIC NOT NULL,
    PRIMARY KEY (name, date)
);

CREATE TABLE players (
    id             INTEGER NOT NULL,
    metrix_name    VARCHAR NOT NULL,
    first_name     VARCHAR,
    last_name      VARCHAR,
    initial_rating INTEGER,
    PRIMARY KEY (id)
);

CREATE TABLE rounds (
    id           INTEGER NOT NULL,
    name         VARCHAR,
    datetime     TIMESTAMPTZ,
    course_id    INTEGER,
    course_name  VARCHAR,
    baskets      INTEGER,
    par_rating   INTEGER,
    point_rating REAL,
    processed    BOOLEAN,
    PRIMARY KEY (id)
);

CREATE TABLE results (
    round_id      INTEGER NOT NULL,
    player_id     INTEGER NOT NULL,
    result        INTEGER NOT NULL,
    player_rating INTEGER,
    round_rating  INTEGER,
    PRIMARY KEY (round_id, player_id)
);

CREATE TABLE ratings (
    player_id INTEGER NOT NULL,
    date      DATE    NOT NULL,
    rating    INTEGER NOT NULL,
    PRIMARY KEY (player_id, date)
);

INSERT INTO settings
VALUES ('MinBaskets', '2025-01-01', 9),
       ('MaxBaskets', '2025-01-01', 90),
       ('MinBirdieDiff', '2025-01-01', 100);