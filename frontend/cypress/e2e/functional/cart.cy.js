describe("Fonctionnalité - gestion du panier", () => {
    let testData;
    let token;
    let stockBefore;

    const getAuthorizationHeaders = () => ({
        Authorization: `Bearer ${token}`,
    });

    const removeProductFromCart = (productId) => {
        return cy
            .request({
                method: "GET",
                url: `${Cypress.env("apiUrl")}/orders`,
                headers: getAuthorizationHeaders(),
            })
            .then((response) => {
                const productLine = response.body.orderLines.find(
                    (orderLine) => orderLine.product.id === productId
                );

                if (productLine) {
                    return cy.request({
                        method: "DELETE",
                        url: `${Cypress.env("apiUrl")}/orders/${productLine.id}/delete`,
                        headers: getAuthorizationHeaders(),
                    });
                }
            });
    };

    const addProductToCartByApi = (
        productId,
        quantity = 1
    ) => {
        return cy.request({
            method: "PUT",
            url: `${Cypress.env("apiUrl")}/orders/add`,
            headers: getAuthorizationHeaders(),
            body: {
                product: productId,
                quantity,
            },
        });
    };

    const invalidCartQuantities = [
        { label: "inférieure à 1", value: "-1" },
        { label: "égale à 0", value: "0" },
        { label: "supérieure à 20", value: "21" },
        { label: "contenant un caractère spécial", value: "@" },
    ];
    before(() => {
        cy.fixture("test-data").then((data) => {
            testData = data;
        });
    });

    beforeEach(() => {
        const product = testData.products.available;

        cy.loginByApi(testData.validUser)
            .then((receivedToken) => {
                token = receivedToken;
                return removeProductFromCart(product.id);
            })
            .then(() => {
                return cy.request({
                    method: "GET",
                    url: `${Cypress.env("apiUrl")}/products/${product.id}`,
                });
            })
            .then((response) => {
                stockBefore = response.body.availableStock;

                cy.visit(`/#/products/${product.id}`, {
                    onBeforeLoad(window) {
                        window.localStorage.setItem("user", token);
                    },
                });
            });
    });

    afterEach(() => {
        const product = testData.products.available;

        removeProductFromCart(product.id).then(() => {
            cy.request({
                method: "GET",
                url: `${Cypress.env("apiUrl")}/products/${product.id}`,
            }).then((response) => {
                expect(
                    response.body.availableStock,
                    "stock restauré après le test"
                ).to.eq(stockBefore);
            });
        });
    });

    it("ajoute un produit disponible et l'affiche dans le panier", () => {
        const product = testData.products.available;

        cy.get('[data-cy="detail-product-name"]')
            .should("have.text", product.name);

        cy.get('[data-cy="detail-product-stock"]')
            .should("contain", `${stockBefore} en stock`);

        cy.get('[data-cy="detail-product-quantity"]')
            .should("have.value", "1");

        cy.intercept(
            "PUT",
            `${Cypress.env("apiUrl")}/orders/add`
        ).as("addProduct");

        cy.get('[data-cy="detail-product-add"]')
            .should("be.visible")
            .and("not.be.disabled")
            .click();

        cy.wait("@addProduct")
            .its("response.statusCode")
            .should("eq", 200);

        cy.location("hash").should("eq", "#/cart");

        cy.contains(
            '[data-cy="cart-line"]',
            product.name
        ).within(() => {
            cy.get('[data-cy="cart-line-name"]')
                .should("have.text", product.name);

            cy.get('[data-cy="cart-line-quantity"]')
                .should("have.value", "1");
        });

        cy.request({
            method: "GET",
            url: `${Cypress.env("apiUrl")}/products/${product.id}`,
        }).then((response) => {
            expect(response.body.availableStock).to.eq(
                stockBefore - 1
            );
        });
    });
    it("empêche l'ajout au panier d'un produit en rupture de stock", () => {
        const product = testData.products.outOfStock;

        cy.request({
            method: "GET",
            url: `${Cypress.env("apiUrl")}/products/${product.id}`,
        }).then((response) => {
            const availableStock = response.body.availableStock;

            expect(availableStock).to.be.at.most(0);

            cy.visit(`/#/products/${product.id}`);

            cy.get('[data-cy="detail-product-name"]')
                .should("have.text", product.name);

            cy.get('[data-cy="detail-product-stock"]')
                .should("contain", `${availableStock} en stock`);

            cy.get("body").then(($body) => {
                const addButton = $body.find(
                    '[data-cy="detail-product-add"]'
                );

                const additionIsBlocked =
                    addButton.length === 0 ||
                    addButton.is(":disabled");

                expect(
                    additionIsBlocked,
                    "le bouton doit être absent ou désactivé en cas de rupture"
                ).to.eq(true);
            });
        });
    });
    it("n'envoie pas une quantité supérieure à 20", () => {
        const product = testData.products.available;
        const excessiveQuantity = 21;
        let requestWasSent = false;

        cy.intercept(
            "PUT",
            `${Cypress.env("apiUrl")}/orders/add`,
            () => {
                requestWasSent = true;
            }
        ).as("excessiveQuantityRequest");

        cy.get('[data-cy="detail-product-quantity"]')
            .clear()
            .type(excessiveQuantity.toString())
            .should("have.value", excessiveQuantity.toString());

        cy.get('[data-cy="detail-product-add"]').click();

        // Temps d'observation nécessaire pour vérifier l'absence de requête.
        cy.wait(1000);

        cy.then(() => {
            expect(
                requestWasSent,
                "aucune requête d'ajout ne doit être envoyée au-delà de 20"
            ).to.eq(false);
        });

        cy.location("hash").should(
            "eq",
            `#/products/${product.id}`
        );
    });

    invalidCartQuantities.forEach(({ label, value }) => {
        it(`refuse une quantité ${label} dans le panier`, () => {
            const product = testData.products.available;

            addProductToCartByApi(product.id, 1)
                .its("status")
                .should("eq", 200);

            cy.visit("/#/cart");

            cy.contains(
                '[data-cy="cart-line"]',
                product.name
            )
                .find('[data-cy="cart-line-quantity"]')
                .as("quantityInput");

            /*
             * Déclenche l'événement du champ avec la valeur à tester.
             * Pour le caractère spécial, le champ numérique transforme
             * normalement la valeur en champ vide.
             */
            cy.get("@quantityInput")
                .invoke("val", value)
                .trigger("input");

            // Le composant utilise un délai de 500 ms avant la mise à jour.
            cy.wait(1000);

            cy.request({
                method: "GET",
                url: `${Cypress.env("apiUrl")}/orders`,
                headers: getAuthorizationHeaders(),
            }).then((response) => {
                const productLine = response.body.orderLines.find(
                    (orderLine) => orderLine.product.id === product.id
                );

                expect(productLine).to.exist;

                expect(
                    productLine.quantity,
                    `quantité enregistrée après la saisie de "${value}"`
                ).to.eq(1);
            });

            cy.get("@quantityInput").should("have.value", "1");
        });
    });
});
