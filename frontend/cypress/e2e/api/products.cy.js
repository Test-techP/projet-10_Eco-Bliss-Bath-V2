describe("API - GET /products", () => {
  let testData;

  before(() => {
    cy.fixture("test-data").then((data) => {
      testData = data;
    });
  });

  it("retourne la liste complète des produits", () => {
    cy.request({
      method: "GET",
      url: `${Cypress.env("apiUrl")}/products`,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an("array");
      expect(response.body).to.have.length(8);

      response.body.forEach((product) => {
        expect(product).to.include.all.keys(
          "id",
          "name",
          "description",
          "price",
          "picture",
          "availableStock"
        );

        expect(product.id).to.be.a("number");
        expect(product.name).to.be.a("string").and.not.be.empty;
        expect(product.price).to.be.a("number");
        expect(product.picture).to.be.a("string").and.not.be.empty;
      });
    });
  });

  it("retourne le détail du produit demandé", () => {
    const product = testData.products.available;

    cy.request({
      method: "GET",
      url: `${Cypress.env("apiUrl")}/products/${product.id}`,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.id).to.eq(product.id);
      expect(response.body.name).to.eq(product.name);
      expect(response.body.availableStock).to.be.a("number");
      expect(response.body.availableStock).to.be.greaterThan(0);

      expect(response.body).to.include.all.keys(
        "skin",
        "aromas",
        "ingredients",
        "description",
        "price",
        "picture"
      );
    });
  });
});