describe("API - produits", () => {
  let testData;

  const expectValidProduct = (product) => {
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
    expect(product.description).to.be.a("string").and.not.be.empty;
    expect(product.price).to.be.a("number");
    expect(product.picture).to.be.a("string").and.not.be.empty;
    expect(product.availableStock).to.be.a("number");
  };

  before(() => {
    return cy.fixture("test-data").then((data) => {
      testData = data;
    });
  });

  describe("GET /products", () => {
    it("retourne une liste de produits conforme", () => {
      cy.request({
        method: "GET",
        url: `${Cypress.env("apiUrl")}/products`,
      }).then((response) => {
        expect(response.status).to.eq(200);

        expect(response.body)
          .to.be.an("array")
          .and.not.be.empty;

        response.body.forEach((product) => {
          expectValidProduct(product);
        });
      });
    });
  });

  describe("GET /products/{id}", () => {
    it("retourne le détail du produit demandé", () => {
      const product = testData.products.available;

      cy.request({
        method: "GET",
        url: `${Cypress.env("apiUrl")}/products/${product.id}`,
      }).then((response) => {
        expect(response.status).to.eq(200);

        expectValidProduct(response.body);

        expect(response.body.id).to.eq(product.id);
        expect(response.body.name).to.eq(product.name);

        expect(response.body).to.include.all.keys(
          "skin",
          "aromas",
          "ingredients"
        );

        expect(response.body.skin)
          .to.be.a("string")
          .and.not.be.empty;

        expect(response.body.aromas)
          .to.be.a("string")
          .and.not.be.empty;

        expect(response.body.ingredients)
          .to.be.a("string")
          .and.not.be.empty;
      });
    });
  });
});