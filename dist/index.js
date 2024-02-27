"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.get("/api/items", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const { query: { q, extraInfo } } = request;
    try {
        const searchResponse = yield axios_1.default.get(`https://api.mercadolibre.com/sites/MLA/search?q=${q}`);
        const { results, filters } = searchResponse.data;
        const category = filters.find((x) => x.id === "category");
        let categories;
        if (category) {
            const values = category.values.find((x) => x.path_from_root);
            categories = values.path_from_root.map((x) => x.name);
        }
        else {
            if (extraInfo === "true") {
                const categoriesResponse = yield axios_1.default.get(`https://api.mercadolibre.com/categories/${results[0].category_id}`);
                categories = categoriesResponse.data.path_from_root.map((x) => x.name);
            }
        }
        const slicedResults = results.slice(0, 4);
        const items = slicedResults.map((item) => {
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
                const { data: itemResponseData } = yield axios_1.default.get(`https://api.mercadolibre.com/items/${item.id}`);
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
    }
    catch (error) {
        return response.status(500).json({ error: "Server Error" });
    }
}));
app.get("/api/items/:id", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    try {
        const itemResponse = yield fetch(`https://api.mercadolibre.com/items/${id}`);
        const itemResponseData = yield itemResponse.json();
        const descriptionResponse = yield fetch(`https://api.mercadolibre.com/items/${id}/description`);
        const descriptionResponseData = yield descriptionResponse.json();
        const categoryId = itemResponseData.category_id;
        const categoriesResponse = yield fetch(`https://api.mercadolibre.com/categories/${categoryId}`);
        const categoriesResponseData = yield categoriesResponse.json();
        const categories = categoriesResponseData.path_from_root.map((x) => x.name);
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
    }
    catch (error) {
        return response.status(500).json({ error: "Server Error" });
    }
}));
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
