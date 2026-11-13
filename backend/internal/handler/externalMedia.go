package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/ja-vi-esse-filme/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

type tmdbSearchResult struct {
	ID           int      `json:"id"`
	MediaType    string   `json:"media_type"` // "movie" ou "tv"
	Title        string   `json:"title"`      // para filmes
	Name         string   `json:"name"`       // para séries
	OrigTitle    string   `json:"original_title"`
	OrigName     string   `json:"original_name"`
	Overview     string   `json:"overview"`
	PosterPath   string   `json:"poster_path"`
	BackdropPath string   `json:"backdrop_path"`
	ReleaseDate  string   `json:"release_date"`   // filme
	FirstAirDate string   `json:"first_air_date"` // série
	VoteAverage  float64  `json:"vote_average"`
	GenreIDs     []int    `json:"genre_ids"`
}

type tmdbSearchResponse struct {
	Results []tmdbSearchResult `json:"results"`
}

var popularMockMedia = []schemas.ExternalMediaResult{
	{
		TMDBID:        157336,
		Type:          schemas.MediaTypeMovie,
		Title:         "Interestelar",
		OriginalTitle: "Interstellar",
		Overview:      "As reservas naturais da Terra estão chegando ao fim e um grupo de astronautas é enviado para encontrar um novo lar para a humanidade.",
		PosterURL:     "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
		BackdropURL:   "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
		ReleaseDate:   "2014-11-05",
		Year:          2014,
		Genres:        "Ficção científica, Drama, Aventura",
		VoteAverage:   8.4,
	},
	{
		TMDBID:        27205,
		Type:          schemas.MediaTypeMovie,
		Title:         "A Origem",
		OriginalTitle: "Inception",
		Overview:      "Dom Cobb é um ladrão habilidoso, o melhor na perigosa arte da extração, roubando segredos valiosos do fundo do subconsciente durante o estado de sono.",
		PosterURL:     "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
		BackdropURL:   "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
		ReleaseDate:   "2010-07-15",
		Year:          2010,
		Genres:        "Ação, Ficção científica, Aventura",
		VoteAverage:   8.4,
	},
	{
		TMDBID:        1396,
		Type:          schemas.MediaTypeTV,
		Title:         "Breaking Bad: A Química do Mal",
		OriginalTitle: "Breaking Bad",
		Overview:      "Ao descobrir que está com câncer terminal, um professor de química do ensino médio se junta a um ex-aluno para fabricar e vender metanfetamina.",
		PosterURL:     "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
		BackdropURL:   "https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
		ReleaseDate:   "2008-01-20",
		Year:          2008,
		Genres:        "Drama, Crime",
		VoteAverage:   8.9,
	},
	{
		TMDBID:        693134,
		Type:          schemas.MediaTypeMovie,
		Title:         "Duna: Parte 2",
		OriginalTitle: "Dune: Part Two",
		Overview:      "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.",
		PosterURL:     "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
		BackdropURL:   "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
		ReleaseDate:   "2024-02-27",
		Year:          2024,
		Genres:        "Ficção científica, Aventura",
		VoteAverage:   8.2,
	},
	{
		TMDBID:        87108,
		Type:          schemas.MediaTypeTV,
		Title:         "Chernobyl",
		OriginalTitle: "Chernobyl",
		Overview:      "Minissérie que dramatiza a história do desastre nuclear de 1986 em Chernobyl e os corajosos homens e mulheres que fizeram sacrifícios inacreditáveis.",
		PosterURL:     "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
		BackdropURL:   "https://image.tmdb.org/t/p/w1280/uL6Ad12W0bxyH46Qz080Bq55gT.jpg",
		ReleaseDate:   "2019-05-06",
		Year:          2019,
		Genres:        "Drama, História",
		VoteAverage:   8.7,
	},
	{
		TMDBID:        66732,
		Type:          schemas.MediaTypeTV,
		Title:         "Stranger Things",
		OriginalTitle: "Stranger Things",
		Overview:      "Quando um garoto desaparece, uma pequena cidade descobre um mistério envolvendo experimentos secretos, forças sobrenaturais e uma garota muito estranha.",
		PosterURL:     "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
		BackdropURL:   "https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
		ReleaseDate:   "2016-07-15",
		Year:          2016,
		Genres:        "Ficção científica, Terror, Mistério",
		VoteAverage:   8.6,
	},
}

// SearchExternalMediaHandler busca filmes e séries pelo TMDB ou fallback local
func SearchExternalMediaHandler(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusOK, gin.H{
			"results": popularMockMedia,
			"source":  "featured",
		})
		return
	}

	mediaTypeFilter := strings.TrimSpace(c.Query("type")) // movie, tv ou vazio (todos)

	// 1. Tenta buscar no TMDB caso tenha TMDB_API_KEY no config ou ambiente
	tmdbKey := cfg.TmdbAPIKey
	if tmdbKey == "" {
		tmdbKey = os.Getenv("TMDB_API_KEY")
	}
	if tmdbKey != "" {
		results, err := searchTMDB(query, mediaTypeFilter, tmdbKey)
		if err == nil && len(results) > 0 {
			c.JSON(http.StatusOK, gin.H{
				"results": results,
				"source":  "tmdb",
			})
			return
		}
	}

	// 2. Busca no banco de dados local primeiro
	var localItems []schemas.MediaItem
	dbQuery := db.Where("LOWER(title) LIKE ? OR LOWER(original_title) LIKE ?", "%"+strings.ToLower(query)+"%", "%"+strings.ToLower(query)+"%")
	if mediaTypeFilter == "movie" || mediaTypeFilter == "tv" {
		dbQuery = dbQuery.Where("type = ?", mediaTypeFilter)
	}
	dbQuery.Limit(10).Find(&localItems)

	results := make([]schemas.ExternalMediaResult, 0)
	for _, item := range localItems {
		tmdbID := 0
		if item.TMDBID != nil {
			tmdbID = *item.TMDBID
		}
		results = append(results, schemas.ExternalMediaResult{
			TMDBID:        tmdbID,
			Type:          item.Type,
			Title:         item.Title,
			OriginalTitle: item.OriginalTitle,
			Overview:      item.Overview,
			PosterURL:     item.PosterURL,
			BackdropURL:   item.BackdropURL,
			ReleaseDate:   item.ReleaseDate,
			Year:          item.Year,
			Genres:        item.Genres,
		})
	}

	// 3. Fallback inteligente na lista popular caso o banco local não tenha
	lowerQuery := strings.ToLower(query)
	for _, mock := range popularMockMedia {
		if strings.Contains(strings.ToLower(mock.Title), lowerQuery) ||
			strings.Contains(strings.ToLower(mock.OriginalTitle), lowerQuery) {
			// Evita duplicatas com os locais
			duplicate := false
			for _, r := range results {
				if r.TMDBID == mock.TMDBID && mock.TMDBID > 0 {
					duplicate = true
					break
				}
			}
			if !duplicate {
				results = append(results, mock)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"source":  "local",
	})
}

func searchTMDB(query, mediaType, apiKey string) ([]schemas.ExternalMediaResult, error) {
	endpoint := fmt.Sprintf("https://api.themoviedb.org/3/search/multi?api_key=%s&language=pt-BR&query=%s&include_adult=false", apiKey, url.QueryEscape(query))
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(endpoint)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tmdb retornou status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var tmdbResp tmdbSearchResponse
	if err := json.Unmarshal(body, &tmdbResp); err != nil {
		return nil, err
	}

	results := make([]schemas.ExternalMediaResult, 0)
	for _, item := range tmdbResp.Results {
		if item.MediaType != "movie" && item.MediaType != "tv" {
			continue
		}
		if mediaType != "" && item.MediaType != mediaType {
			continue
		}

		title := item.Title
		origTitle := item.OrigTitle
		relDate := item.ReleaseDate
		if item.MediaType == "tv" {
			title = item.Name
			origTitle = item.OrigName
			relDate = item.FirstAirDate
		}

		year := 0
		if len(relDate) >= 4 {
			var y int
			if _, err := fmt.Sscanf(relDate[:4], "%d", &y); err == nil {
				year = y
			}
		}

		posterURL := ""
		if item.PosterPath != "" {
			posterURL = "https://image.tmdb.org/t/p/w500" + item.PosterPath
		}
		backdropURL := ""
		if item.BackdropPath != "" {
			backdropURL = "https://image.tmdb.org/t/p/w1280" + item.BackdropPath
		}

		results = append(results, schemas.ExternalMediaResult{
			TMDBID:        item.ID,
			Type:          schemas.MediaType(item.MediaType),
			Title:         title,
			OriginalTitle: origTitle,
			Overview:      item.Overview,
			PosterURL:     posterURL,
			BackdropURL:   backdropURL,
			ReleaseDate:   relDate,
			Year:          year,
			VoteAverage:   item.VoteAverage,
		})
	}

	log.Printf("[TMDB] Busca por '%s' retornou %d resultados", query, len(results))
	return results, nil
}
