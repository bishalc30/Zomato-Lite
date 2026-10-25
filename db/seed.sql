INSERT INTO restaurants (name, cuisine, area)
VALUES ('Ludhiana Burrito', 'Indian', 'Sector 32');

INSERT INTO reviews (restaurant_id, rating, comment, created_at)
VALUES
  (1, 5, 'Paneer burrito is unreal',     NOW() - INTERVAL '8 days'),
  (1, 4, 'Good, but slow service',       NOW() - INTERVAL '6 days'),
  (1, 4, 'Solid. Would repeat.',         NOW() - INTERVAL '2 days');
