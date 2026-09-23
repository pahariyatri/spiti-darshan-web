# Image assets

Source images live in `media-source/`, and each one's alt text, author, licence and source are in
`media-source/manifest.json`. `pnpm images` (run automatically before every build) generates the responsive
AVIF/WebP variants in `public/media/`.

| Asset                      | Used for                                 | Author                                        | Licence                | Source                                                                                                                                                                         |
| -------------------------- | ---------------------------------------- | --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hero-vehicles`            | Hero, vehicle page, default social image | Spiti Darshan                                 | Owned by Spiti Darshan | Own photo                                                                                                                                                                      |
| `fleet-parked`             | Vehicle section                          | Spiti Darshan                                 | Owned by Spiti Darshan | Own photo                                                                                                                                                                      |
| `day-kinnaur-valley`       | Day 1                                    | Sanyam Bahga from Roorkee, India              | CC BY-SA 2.0           | [Kinnaur 344 (9527158279).jpg](<https://commons.wikimedia.org/wiki/File:Kinnaur_344_(9527158279).jpg>)                                                                         |
| `day-kalpa-kinner-kailash` | Day 2                                    | Anubhav Agarwal (edited on Wikimedia Commons) | CC BY-SA 4.0           | [Kinner Kailash Mountain Range (edited).jpg](<https://commons.wikimedia.org/wiki/File:Kinner_Kailash_Mountain_Range_(edited).jpg>)                                             |
| `day-nako`                 | Day 3                                    | Steve Bennett                                 | CC BY-SA 3.0           | [Nako 11 Stevage.jpg](https://commons.wikimedia.org/wiki/File:Nako_11_Stevage.jpg)                                                                                             |
| `day-dhankar`              | Day 4                                    | Deepank Ranka                                 | CC BY-SA 4.0           | [Dhankar Gompa, Spiti.jpg](https://commons.wikimedia.org/wiki/File:Dhankar_Gompa,_Spiti.jpg)                                                                                   |
| `day-key-monastery`        | Day 5                                    | Mike Shaw                                     | CC BY-SA 4.0           | [Key Gompa monastery, Spiti Valley, Himachal Pradesh, India 03.jpg](https://commons.wikimedia.org/wiki/File:Key_Gompa_monastery,_Spiti_Valley,_Himachal_Pradesh,_India_03.jpg) |
| `day-langza`               | Day 6                                    | Photoholic7517                                | CC0                    | [Buddha statue langza.jpg](https://commons.wikimedia.org/wiki/File:Buddha_statue_langza.jpg)                                                                                   |
| `day-kaza`                 | Day 7                                    | Gerd Eichmann                                 | CC BY-SA 4.0           | [Kaza-20-Spiti-gje.jpg](https://commons.wikimedia.org/wiki/File:Kaza-20-Spiti-gje.jpg)                                                                                         |
| `day-chandratal`           | Day 8                                    | Adarsh Patel                                  | CC BY-SA 4.0           | [Chandra Taal (Lake), HP, India, D35 7265nx-01.jpg](<https://commons.wikimedia.org/wiki/File:Chandra_Taal_(Lake),_HP,_India,_D35_7265nx-01.jpg>)                               |
| `day-atal-tunnel`          | Day 9                                    | Jagseer S Sidhu                               | CC BY-SA 4.0           | [Atal Tunnel 01.jpg](https://commons.wikimedia.org/wiki/File:Atal_Tunnel_01.jpg)                                                                                               |

The day photos are real photos of each place from Wikimedia Commons, used under their licences (CC BY-SA or
CC0). **Attribution is required** for CC BY-SA, so every day section shows "Photo: author, licence" with
links to the source page and licence. Keep those credits if you move or crop a photo.

The two vehicle photos are Spiti Darshan's own, but they are small (680×510 and 510×510). Supplying the
full-size originals would sharpen the hero and vehicle section.

## Replacing a photo

1. Put the image in `media-source/` (your own photo, or one whose licence allows reuse).
2. Add or update its entry in `media-source/manifest.json`: `stem`, honest `alt` text, `credit`, `license`,
   and for third-party photos `creditUrl` and `licenseUrl` (these produce the on-page credit).
3. Reference the stem from `src/content/routes/<route>.ts` (`media: '<stem>'`).
4. Run `pnpm build`. The build fails if a stem doesn't exist.
