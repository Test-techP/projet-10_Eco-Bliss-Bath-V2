describe("Sécurité - confidentialité des avis", () => {
    it("ne divulgue aucune donnée sensible concernant les auteurs", () => {
        const forbiddenFields = [
            "password",
            "salt",
            "email",
            "userIdentifier",
            "username",
            "roles",
            "__initializer__",
            "__cloner__",
            "__isInitialized__",
        ];

        cy.request({
            method: "GET",
            url: `${Cypress.env("apiUrl")}/reviews`,
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.be.an("array").and.not.be.empty;

            response.body.forEach((review) => {
                expect(review.author).to.be.an("object");
            });

            const exposedFields = [
                ...new Set(
                    response.body.flatMap((review) =>
                        forbiddenFields.filter((field) =>
                            Object.prototype.hasOwnProperty.call(
                                review.author,
                                field
                            )
                        )
                    )
                ),
            ];

            expect(
                exposedFields,
                `champs exposés : ${exposedFields.join(", ")}`
            ).to.deep.eq([]);
        });
    });
});