import { useState, useEffect } from "react";
import { Recipe } from "../types";
import RecipeCard from "./RecipeCard";
import "./ScrollableRecipeList.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { logout } from "../utils/auth.ts";

interface ScrollableRecipeListProps {
  recipes: Recipe[];
  onUnlike?: (recipeId: number) => void;
}

const formatTitle = (title: string) => {
  return title
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const ScrollableRecipeList: React.FC<ScrollableRecipeListProps> = ({
  recipes,
  onUnlike,
}) => {
  const [likedRecipes, setLikedRecipes] = useState<Set<number>>(new Set());
  const [removingRecipes] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/favorites`;

  // Fetch all favorites on mount
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/"); // Redirect to login if no token
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const favoriteIds = new Set(response.data.map((fav: any) => fav.recipe_id));
        setLikedRecipes(favoriteIds);
      } catch (error: any) {
        console.error("Error fetching favorites:", error);
        if (error.response?.status === 401) {
          logout(navigate);
        }
      }
    };

    fetchFavorites();
  }, [navigate]);

  const toggleLike = async (recipeId: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const isLiked = likedRecipes.has(recipeId);

    try {
      if (isLiked) {
        await axios.delete(API_BASE_URL, {
          data: { recipe_id: recipeId },
          headers: { Authorization: `Bearer ${token}` },
        });
        setLikedRecipes((prevLiked) => {
          const newLiked = new Set(prevLiked);
          newLiked.delete(recipeId); // Fixed: Remove on unlike
          return newLiked;
        });
        if (onUnlike) onUnlike(recipeId);
      } else {
        await axios.post(
          API_BASE_URL,
          { recipe_id: recipeId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLikedRecipes((prevLiked) => {
          const newLiked = new Set(prevLiked);
          newLiked.add(recipeId); // Add on like
          return newLiked;
        });
      }
    } catch (error: any) {
      console.error("Error toggling like:", error);
      if (error.response?.status === 401) {
        logout(navigate);
      } else if (error.response?.status === 404 && isLiked) {
        setLikedRecipes((prevLiked) => {
          const newLiked = new Set(prevLiked);
          newLiked.delete(recipeId);
          return newLiked;
        });
        if (onUnlike) onUnlike(recipeId);
      }
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    navigate(`/recipe/${recipe.id}`);
  };

  return (
    <div className="recipe-list-container">
      {recipes.map((item) => (
        <div
          className={`card-wrapper ${
            removingRecipes.has(item.id) ? "dissolve" : ""
          }`}
          key={item.id}
        >
          <RecipeCard
            image_source={item.image_source || "assets/bruschetta.png"}
            title={formatTitle(item.title)}
            creator={`by ${item.author_id || "Unknown"}`}
            onClick={() => handleRecipePress(item)}
          />
          <button
            className={`heart-icon-container ${
              likedRecipes.has(item.id) ? "heart-icon-container-liked" : ""
            }`}
            onClick={() => toggleLike(item.id)}
          >
            {likedRecipes.has(item.id) ? "❤️" : "🤍"}
          </button>
        </div>
      ))}
    </div>
  );
};

export default ScrollableRecipeList;