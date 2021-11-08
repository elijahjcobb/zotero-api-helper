/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as Express from "express";
import got from "got";

const app = Express();

type Collection = {
	key: string;
	name: string;
	parent?: string;
};

type CollectionMap = Collection & {
	children: Collection[]
}

function getAllChildren(collections: Collection[], collection: Collection): CollectionMap {
	const children: Collection[] = [];
	for (const col of collections) {
		if (col.parent === collection.key) children.push(getAllChildren(collections, col));
	}
	return {
		...collection,
		children
	}

}

async function fetchCollectionMap(collection: string): Promise<CollectionMap> {
	const collections = await fetchAllCollections();
	let col: Collection;
	for (const c of collections) {
		if (c.key === collection) {
			col = c;
			break;
		}
	}

	if (!col) throw new Error("No collection.");

	return getAllChildren(collections, col);
}

function getAllCollectionsRecursively(collections: Collection[], newCollections: Collection[], collection: Collection): void {
	for (const col of collections) {
		if (col.parent === collection.key) {
			newCollections.push(col);
			getAllCollectionsRecursively(collections, newCollections, col)
		}
	}
}

async function fetchCollectionsRecursively(collection: string): Promise<Collection[]> {
	const collections = await fetchAllCollections();
	let col: Collection;
	for (const c of collections) {
		if (c.key === collection) {
			col = c;
			break;
		}
	}

	if (!col) throw new Error("No collection.");

	const cols: Collection[] = [col];
	getAllCollectionsRecursively(collections, cols, col);
	return cols;
}

async function fetchAllCollections(): Promise<Collection[]> {
	const res = await got.get("https://api.zotero.org/groups/2721722/collections?limit=1000");
	const json = JSON.parse(res.body) as { data: {key: string, name: string, parentCollection?: string} }[];
	const collections: Collection[] = [];
	for (const col of json) {
		const collection = {
			key: col.data.key,
			name: col.data.name,
			parent: undefined
		};
		if (col.data.parentCollection) collection.parent = col.data.parentCollection;
		collections.push(collection);
	}
	return collections;
}

async function fetchItemsInCollection(key: string): Promise<object[]> {
	const collections = await fetchCollectionsRecursively(key);
	const items: object[] = [];
	for (const col of collections) {
		const res = await got.get(`https://api.zotero.org/groups/2721722/collections/${col.key}/items?&limit=150&v=3`);
		const i = JSON.parse(res.body);
		items.push(...i);
	}
	return items;
}

async function fetchBibInCollection(key: string): Promise<string> {
	const collections = await fetchCollectionsRecursively(key);
	let bib = [];
	for (const col of collections) {
		const res = await got.get(`https://api.zotero.org/groups/2721722/collections/${col.key}/items?format=biblatex&limit=150&v=3`);
		bib.push(res.body);
	}
	return bib.join("\n\n");
}

app.get("/collections", async (req, res) => {
	res.send(await fetchAllCollections());
});

app.get("/collections/:id", async (req, res) => {
	res.send(await fetchCollectionMap(req.params.id));
});

app.get("/collections/:id/collections", async (req, res) => {
	res.send(await fetchCollectionsRecursively(req.params.id));
});

app.get("/collections/:id/items", async (req, res) => {
	res.send(await fetchItemsInCollection(req.params.id));
});

app.get("/collections/:id/bib", async (req, res) => {
	res.send(await fetchBibInCollection(req.params.id));
});

app.listen(3000, () => console.log("API live."));