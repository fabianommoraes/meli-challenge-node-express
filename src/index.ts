import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";

type Filter = {
  id: string;
};

type Value = {
  path_from_root: [];
};

type Category = {
  name: string;
};

type MLItem = {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  condition: string;
  shipping: {
    free_shipping: string;
  };
};

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/api/items", async (request: Request, response: Response) => {
  
  const {
    query: { q, extraInfo }
  } = request;

  try {
    const searchResponse = await axios.get(
      `https://api.mercadolibre.com/sites/MLA/search?q=${q}`
    );

    const { results, filters } = searchResponse.data;
    const category = filters.find((x: Filter) => x.id === "category");

    let categories;

    if (category) {
      const values = category.values.find((x: Value) => x.path_from_root);
      categories = values.path_from_root.map((x: Category) => x.name);
    } else {
      if (extraInfo === "true") {
        const categoriesResponse = await axios.get(
          `https://api.mercadolibre.com/categories/${results[0].category_id}`
        );
        categories = categoriesResponse.data.path_from_root.map(
          (x: Category) => x.name
        );
      }
    }

    const slicedResults = results.slice(0, 4);

    const items = slicedResults.map((item: MLItem) => {
      const [amount, decimals] = item.price.toString().split(".");

      const formattedDecimals = Boolean(decimals) ? decimals : "00";

      return {
        id: item.id,
        title: item.title,
        price: {
          currency: item.currency_id,
          amount: parseInt(amount),
          decimals: formattedDecimals
        },
        picture: item.thumbnail,
        condition: item.condition,
        free_shipping: item.shipping.free_shipping
      };
    });

    if (extraInfo === "true") {
      for (const item of items) {
        const { data: itemResponseData } = await axios.get(
          `https://api.mercadolibre.com/items/${item.id}`
        );
        item.state = itemResponseData.seller_address.state.name;
      }
    }

    const itemsResponse = {
      author: {
        name: "Fabiano",
        lastname: "Moraes"
      },
      categories: categories,
      items: items
    };

    return response.status(200).json(itemsResponse);
  } catch (error) {
    return response.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/items/:id", async (request: Request, response: Response) => {

  const { id } = request.params;

  try {
    const itemResponse = await fetch(
      `https://api.mercadolibre.com/items/${id}`
    );
    const itemResponseData = await itemResponse.json();

    const descriptionResponse = await fetch(
      `https://api.mercadolibre.com/items/${id}/description`
    );
    const descriptionResponseData = await descriptionResponse.json();

    const categoryId = itemResponseData.category_id;

    const categoriesResponse = await fetch(
      `https://api.mercadolibre.com/categories/${categoryId}`
    );
    const categoriesResponseData = await categoriesResponse.json();

    const categories = categoriesResponseData.path_from_root.map(
      (x: Category) => x.name
    );

    const [amount, decimals] = itemResponseData.price.toString().split(".");

    const formattedDecimals = Boolean(decimals) ? decimals : "00";

    const itemDetailResponse = {
      author: {
        name: "Fabiano",
        lastname: "Moraes"
      },
      item: {
        id: itemResponseData.id,
        title: itemResponseData.title,
        price: {
          currency: itemResponseData.currency_id,
          amount: parseInt(amount),
          decimals: formattedDecimals
        },
        picture: itemResponseData.pictures[0].url,
        condition: itemResponseData.condition,
        free_shipping: itemResponseData.shipping.free_shipping,
        sold_quantity: itemResponseData.initial_quantity,
        description: descriptionResponseData.plain_text
      },
      categories: categories
    };

    return response.status(200).json(itemDetailResponse);
  } catch (error) {
    return response.status(500).json({ error: "Server Error" });
  }

})

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});