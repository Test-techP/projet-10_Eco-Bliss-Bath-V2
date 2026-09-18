const getAuthorizationHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

const getOrder = (token) => {
  return cy.request({
    method: "GET",
    url: `${Cypress.env("apiUrl")}/orders`,
    headers: getAuthorizationHeaders(token),
  });
};

const getProduct = (productId) => {
  return cy.request({
    method: "GET",
    url: `${Cypress.env("apiUrl")}/products/${productId}`,
  });
};

const findOrderLine = (order, productId) => {
  return order.orderLines.find(
    (orderLine) => orderLine.product.id === productId
  );
};

const addProductToOrder = (
  token,
  productId,
  quantity = 1,
  failOnStatusCode = true
) => {
  return cy.request({
    method: "PUT",
    url: `${Cypress.env("apiUrl")}/orders/add`,
    headers: getAuthorizationHeaders(token),
    failOnStatusCode,
    body: {
      product: productId,
      quantity,
    },
  });
};

const deleteOrderLine = (token, orderLineId) => {
  return cy.request({
    method: "DELETE",
    url:
      `${Cypress.env("apiUrl")}/orders/` +
      `${orderLineId}/delete`,
    headers: getAuthorizationHeaders(token),
  });
};

const changeOrderLineQuantity = (
  token,
  orderLineId,
  quantity
) => {
  return cy.request({
    method: "PUT",
    url:
      `${Cypress.env("apiUrl")}/orders/` +
      `${orderLineId}/change-quantity`,
    headers: getAuthorizationHeaders(token),
    body: {
      quantity,
    },
  });
};

describe("API - GET /orders", () => {
  let testData;

  before(() => {
    return cy.fixture("test-data").then((data) => {
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
      expect(response.body.message).to.eq(
        "JWT Token not found"
      );
    });
  });

  it("retourne le panier de l'utilisateur authentifié", () => {
    cy.loginByApi(testData.validUser)
      .then((token) => getOrder(token))
      .then((response) => {
        expect(response.status).to.eq(200);

        expect(response.body).to.include.all.keys(
          "id",
          "validated",
          "orderLines"
        );

        expect(response.body.validated).to.be.a("boolean");
        expect(response.body.orderLines).to.be.an("array");

        response.body.orderLines.forEach((orderLine) => {
          expect(orderLine).to.include.all.keys(
            "id",
            "product",
            "quantity"
          );

          expect(orderLine.id).to.be.a("number");
          expect(orderLine.product).to.be.an("object");
          expect(orderLine.product.id).to.be.a("number");
          expect(orderLine.quantity).to.be.a("number");
        });
      });
  });
});

describe("API - PUT /orders/add", () => {
  let testData;
  let token;
  let stockBefore = null;

  before(() => {
    return cy.fixture("test-data")
      .then((data) => {
        testData = data;
        return cy.loginByApi(data.validUser);
      })
      .then((receivedToken) => {
        token = receivedToken;
      });
  });

  beforeEach(() => {
    stockBefore = null;

    const product = testData.products.available;

    return getOrder(token).then((response) => {
      const existingLine = findOrderLine(
        response.body,
        product.id
      );

      if (existingLine) {
        return deleteOrderLine(token, existingLine.id);
      }
    });
  });

  afterEach(() => {
    if (typeof stockBefore !== "number") {
      return;
    }

    const product = testData.products.available;

    return getOrder(token)
      .then((response) => {
        const addedLine = findOrderLine(
          response.body,
          product.id
        );

        if (addedLine) {
          return deleteOrderLine(token, addedLine.id);
        }
      })
      .then(() => getProduct(product.id))
      .then((response) => {
        expect(
          response.body.availableStock,
          "stock restauré après le test"
        ).to.eq(stockBefore);
      });
  });

  it("ajoute un produit disponible et décrémente son stock", () => {
    const product = testData.products.available;

    getProduct(product.id)
      .then((response) => {
        stockBefore = response.body.availableStock;

        expect(stockBefore).to.be.greaterThan(0);

        return addProductToOrder(
          token,
          product.id,
          1
        );
      })
      .then((response) => {
        expect(response.status).to.eq(200);

        const addedLine = findOrderLine(
          response.body,
          product.id
        );

        expect(addedLine).to.exist;
        expect(addedLine.quantity).to.eq(1);

        return getProduct(product.id);
      })
      .then((response) => {
        expect(response.body.availableStock).to.eq(
          stockBefore - 1
        );
      });
  });

  it("refuse l'ajout d'un produit dont le stock est épuisé", () => {
    const product = testData.products.outOfStock;

    let initialLine;
    let initialQuantity;
    let initialStock;
    let addResponse;
    let quantityAfterAdd;

    getOrder(token)
      .then((orderResponse) => {
        initialLine = findOrderLine(
          orderResponse.body,
          product.id
        );

        initialQuantity = initialLine?.quantity ?? 0;

        return getProduct(product.id);
      })
      .then((productResponse) => {
        initialStock =
          productResponse.body.availableStock;

        expect(initialStock).to.be.at.most(0);

        return addProductToOrder(
          token,
          product.id,
          1,
          false
        );
      })
      .then((response) => {
        addResponse = response;
        return getOrder(token);
      })
      .then((orderResponse) => {
        const currentLine = findOrderLine(
          orderResponse.body,
          product.id
        );

        quantityAfterAdd = currentLine?.quantity ?? 0;

        if (
          initialLine &&
          currentLine &&
          currentLine.quantity !== initialQuantity
        ) {
          return changeOrderLineQuantity(
            token,
            currentLine.id,
            initialQuantity
          );
        }

        if (!initialLine && currentLine) {
          return deleteOrderLine(
            token,
            currentLine.id
          );
        }
      })
      .then(() => getProduct(product.id))
      .then((productResponse) => {
        expect(
          productResponse.body.availableStock,
          "stock restauré après le test"
        ).to.eq(initialStock);

        expect(
          addResponse.status,
          "code retourné pour un produit en rupture"
        ).to.eq(400);

        expect(
          quantityAfterAdd,
          "quantité après la tentative d'ajout"
        ).to.eq(initialQuantity);
      });
  });
});

describe("API - POST /orders", () => {
  let testData;
  let token;

  before(() => {
    return cy.fixture("test-data")
      .then((data) => {
        testData = data;
        return cy.loginByApi(data.validUser);
      })
      .then((receivedToken) => {
        token = receivedToken;
      });
  });

  it("valide la commande en cours", () => {
    const recoveryProduct = testData.products.available;

    let orderBeforeValidation;
    let validationResponse;
    let recoveryStockBefore;

    getOrder(token)
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.validated).to.eq(false);
        expect(response.body.orderLines)
          .to.be.an("array")
          .and.not.be.empty;

        orderBeforeValidation = response.body;

        return cy.request({
          method: "POST",
          url: `${Cypress.env("apiUrl")}/orders`,
          headers: getAuthorizationHeaders(token),
          failOnStatusCode: false,
          body: testData.order,
        });
      })
      .then((response) => {
        validationResponse = response;

        if (response.status !== 200) {
          return;
        }

        return getProduct(recoveryProduct.id)
          .then((productResponse) => {
            recoveryStockBefore =
              productResponse.body.availableStock;

            return addProductToOrder(
              token,
              recoveryProduct.id,
              1
            );
          })
          .then((addResponse) => {
            expect(
              addResponse.status,
              "création du panier de nettoyage"
            ).to.eq(200);

            const recoveryLine = findOrderLine(
              addResponse.body,
              recoveryProduct.id
            );

            expect(recoveryLine).to.exist;

            return deleteOrderLine(
              token,
              recoveryLine.id
            );
          })
          .then((deleteResponse) => {
            expect(deleteResponse.status).to.eq(200);
            expect(deleteResponse.body.validated).to.eq(false);
            expect(deleteResponse.body.orderLines)
              .to.be.an("array")
              .and.be.empty;

            return getProduct(recoveryProduct.id);
          })
          .then((productResponse) => {
            expect(
              productResponse.body.availableStock,
              "stock restauré après la préparation du nouveau panier"
            ).to.eq(recoveryStockBefore);
          });
      })
      .then(() => {
        expect(
          validationResponse.status,
          "code retourné lors de la validation"
        ).to.eq(200);

        expect(validationResponse.body).to.include.all.keys(
          "id",
          "firstname",
          "lastname",
          "address",
          "zipCode",
          "city",
          "date",
          "validated",
          "orderLines"
        );

        expect(validationResponse.body.id).to.eq(
          orderBeforeValidation.id
        );

        expect(validationResponse.body.validated).to.eq(true);

        expect(validationResponse.body).to.include(
          testData.order
        );

        expect(validationResponse.body.date)
          .to.be.a("string")
          .and.not.be.empty;

        expect(validationResponse.body.orderLines)
          .to.be.an("array")
          .and.not.be.empty;
      });
  });
});
