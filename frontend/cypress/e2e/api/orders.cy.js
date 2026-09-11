
describe("API - GET /orders", () => {
  let testData;

  before(() => {
    cy.fixture("test-data").then((data) => {
      testData = data;
    });
  });

  it("refuse l'accès au panier sans authentification", () => {
    cy.request({
      method: "GET",
      url: `${Cypress.env("apiUrl")}/orders`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body.code).to.eq(401);
      expect(response.body.message).to.eq("JWT Token not found");
    });
  });

  it("retourne le panier de l'utilisateur authentifié", () => {
    cy.loginByApi(testData.validUser).then((token) => {
      cy.request({
        method: "GET",
        url: `${Cypress.env("apiUrl")}/orders`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.include.all.keys(
          "id",
          "validated",
          "orderLines"
        );

        expect(response.body.validated).to.be.a("boolean");
        expect(response.body.orderLines).to.be.an("array").and.not.be.empty;

        response.body.orderLines.forEach((orderLine) => {
          expect(orderLine).to.include.all.keys(
            "id",
            "product",
            "quantity"
          );

          expect(orderLine.product.id).to.be.a("number");
          expect(orderLine.quantity).to.be.a("number");
        });
      });
    });
  });
});
describe("API - PUT /orders/add", () => {
  let testData;
  let token;
  let stockBefore;

  before(() => {
    cy.fixture("test-data")
      .then((data) => {
        testData = data;
        return cy.loginByApi(testData.validUser);
      })
      .then((receivedToken) => {
        token = receivedToken;
      });
  });

  afterEach(() => {
    const product = testData.products.available;

    cy.request({
      method: "GET",
      url: `${Cypress.env("apiUrl")}/orders`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((response) => {
      const addedLine = response.body.orderLines.find(
        (orderLine) => orderLine.product.id === product.id
      );

      if (addedLine) {
        cy.request({
          method: "DELETE",
          url: `${Cypress.env("apiUrl")}/orders/${addedLine.id}/delete`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then((deleteResponse) => {
          expect(deleteResponse.status).to.eq(200);

          cy.request({
            method: "GET",
            url: `${Cypress.env("apiUrl")}/products/${product.id}`,
          }).then((productResponse) => {
            expect(productResponse.body.availableStock).to.eq(stockBefore);
          });
        });
      }
    });
  });

  it("ajoute au panier un produit disponible et décrémente son stock", () => {
    const product = testData.products.available;

    cy.request({
      method: "GET",
      url: `${Cypress.env("apiUrl")}/products/${product.id}`,
    })
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.availableStock).to.be.greaterThan(0);

        stockBefore = response.body.availableStock;
      })
      .then(() => {
        return cy.request({
          method: "PUT",
          url: `${Cypress.env("apiUrl")}/orders/add`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            product: product.id,
            quantity: 1,
          },
        });
      })
      .then((response) => {
        expect(response.status).to.eq(200);

        const addedLine = response.body.orderLines.find(
          (orderLine) => orderLine.product.id === product.id
        );

        expect(addedLine).to.exist;
        expect(addedLine.quantity).to.eq(1);
      })
      .then(() => {
        cy.request({
          method: "GET",
          url: `${Cypress.env("apiUrl")}/products/${product.id}`,
        }).then((response) => {
          expect(response.body.availableStock).to.eq(stockBefore - 1);
        });
      });
  });
});
describe("API - contrôle du stock lors de PUT /orders/add", () => {
  let testData;
  let token;

  before(() => {
    cy.fixture("test-data")
      .then((data) => {
        testData = data;
        return cy.loginByApi(data.validUser);
      })
      .then((receivedToken) => {
        token = receivedToken;
      });
  });

  it("refuse l'ajout d'un produit dont le stock est épuisé", () => {
    const product = testData.products.outOfStock;

    let initialLine;
    let initialStock;
    let addResponse;
    let quantityAfterAdd;

    cy.request({
      method: "GET",
      url: `${Cypress.env("apiUrl")}/orders`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((orderResponse) => {
        initialLine = orderResponse.body.orderLines.find(
          (orderLine) => orderLine.product.id === product.id
        );

        expect(initialLine, "ligne initiale du produit").to.exist;

        return cy.request({
          method: "GET",
          url: `${Cypress.env("apiUrl")}/products/${product.id}`,
        });
      })
      .then((productResponse) => {
        initialStock = productResponse.body.availableStock;

        expect(initialStock).to.be.at.most(0);

        return cy.request({
          method: "PUT",
          url: `${Cypress.env("apiUrl")}/orders/add`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          failOnStatusCode: false,
          body: {
            product: product.id,
            quantity: 1,
          },
        });
      })
      .then((response) => {
        addResponse = response;

        return cy.request({
          method: "GET",
          url: `${Cypress.env("apiUrl")}/orders`,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      })
      .then((orderResponse) => {
        const currentLine = orderResponse.body.orderLines.find(
          (orderLine) => orderLine.product.id === product.id
        );

        quantityAfterAdd = currentLine?.quantity;

        // Restauration de la quantité initiale si l'API a accepté l'ajout.
        if (currentLine && currentLine.quantity !== initialLine.quantity) {
          return cy.request({
            method: "PUT",
            url: `${Cypress.env("apiUrl")}/orders/${currentLine.id}/change-quantity`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: {
              quantity: initialLine.quantity,
            },
          });
        }
      })
      .then(() => {
        return cy.request({
          method: "GET",
          url: `${Cypress.env("apiUrl")}/products/${product.id}`,
        });
      })
      .then((productResponse) => {
        // Cette vérification confirme que le nettoyage a fonctionné.
        expect(
          productResponse.body.availableStock,
          "stock restauré après le test"
        ).to.eq(initialStock);

        // Exigence métier : un produit en rupture doit être refusé.
        expect(
          addResponse.status,
          "code retourné pour un produit en rupture"
        ).to.eq(400);

        expect(
          quantityAfterAdd,
          "quantité après la tentative d'ajout"
        ).to.eq(initialLine.quantity);
      });
  });
});