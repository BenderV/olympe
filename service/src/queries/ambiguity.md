## Query 324
Show the number of netflix movies released each year

```sql
SELECT release_year AS year ,
    COUNT(*) AS number_of_movies_released_per_year
FROM public.netflix_titles
WHERE type = 'Movie' AND date_added IS NOT NULL
GROUP BY 1 
ORDER BY year;
```

```sql
SELECT
    RIGHT("date_added", 4) "year",
    COUNT(*) "number_of_netflix_movies_released_each_year"
FROM public.netflix_titles 
WHERE type = 'Movie'
GROUP BY 1
ORDER BY "year";
```

=> Ambiguity between date_added & release_year

Avvai Shanmughi
release_year: 1996
date_added: September 21, 2021

---

## Query 40
Show the name of the 5 authors with the most articles

validatedSQL
```sql
SELECT
    authors.id,
    authors.name,
    COUNT(DISTINCT(articles.doi)) AS articles_count
FROM    articles
JOIN    association ON (articles.id = articles_id)
JOIN    authors ON (authors.id = authors_id)
GROUP BY  1
ORDER BY  3
DESC LIMIT 5
```

```sql
SELECT authors.name 
    ,COUNT(articles.id) AS count
FROM authors
JOIN association ON (authors.id = authors_id)
JOIN articles ON (articles.id = articles_id)
GROUP BY authors.name
ORDER BY count DESC
LIMIT 5
```
-> Technically, the SQL is correct...just missing the id, but should it be there ?

---

## Query 279
Show top 3 longest film released in 2022

validatedSQL
```sql
SELECT 
    title ,
    (LEFT(duration ,LENGTH(duration) - 3))::INT AS duration_in_minutes
FROM    public.netflix_titles
WHERE   release_year = 2022 AND "type" = 'Movie'
ORDER BY  duration_in_minutes DESC
LIMIT   3
```

```sql
SELECT title ,
    LEFT(duration ,LENGTH(duration) - 3) AS duration_in_minutes
FROM public.netflix_titles
WHERE "type" = 'Movie'
ORDER BY duration_in_minutes DESC
LIMIT 3
```

-> Real error: Missing 2022...

---

## Query 347
Show me the number of movie with more than 4 actors

validatedSQL
```sql
SELECT COUNT(*)
FROM public.netflix_titles
WHERE type = 'Movie' AND ARRAY_LENGTH(STRING_TO_ARRAY("cast", ','), 1) > 4
```

```sql
SELECT COUNT(*)
FROM public.netflix_titles
WHERE type = 'Movie' AND ("cast" ~ ', ');
```

-> Real error: fail to understand that if should split with ',' and count...

---

## Query 359
Show the number of validated queries

```sql
SELECT COUNT("query"."validatedSQL") AS "validated_count" FROM "query"
```

```sql
SELECT COUNT( CASE WHEN "query"."validatedSQL" IS NOT NULL THEN 1 ELSE NULL END ) AS "validated_count" FROM "query"
```

-> Good (difference is suger syntax...)

## Query 316
Show me all the movie that talk about a dog

```sql
SELECT  *
FROM    public.netflix_titles
WHERE   LOWER(description) LIKE LOWER('%dog%') AND "type" = 'Movie'
```

```sql
SELECT *
FROM public.netflix_titles
WHERE LOWER(description) LIKE LOWER('%dog%');
```

-> Real error: missing filtrage of type Movie

---

## Query 103
Show articles that talk about longevity in their abstract, with the highest number of references

validatedSQL
```sql
SELECT  DISTINCT(article_id) ,COUNT(*)
FROM    reference
JOIN    articles ON  (article_id = articles.id)
WHERE   abstract LIKE '%longevity%'
GROUP BY  1
ORDER BY  2 DESC
LIMIT   1
```

```sql
SELECT
    title, references_count
FROM articles
WHERE abstract ILIKE '%longevity%'
ORDER BY 2 DESC
LIMIT 50
```

-> Real error: shouldn't have limit 50
-> Ambiguity that could be resolved: references_count vs table reference


