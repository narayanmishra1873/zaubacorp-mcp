import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// Currency conversion and analysis tool
		this.server.tool(
			"currency_convert_and_analyze",
			{
				amount: z.number(),
				from: z.string().length(3), // e.g., "INR"
				to: z.string().length(3).optional(),
			},
			async ({ amount, from, to = "USD" }) => {
				// Mocked exchange rates
				const exchangeRates: Record<string, number> = {
					"USD_INR": 83,
					"INR_USD": 1 / 83,
					"EUR_USD": 1.08,
					"USD_EUR": 1 / 1.08,
					"JPY_USD": 1 / 156,
					"USD_JPY": 156,
				};

				const key = `${from.toUpperCase()}_${to.toUpperCase()}`;
				const rate = exchangeRates[key];

				if (!rate) {
					return {
						content: [
							{
								type: "text",
								text: `Sorry, I don't have the exchange rate for ${from} to ${to}.`,
							},
						],
					};
				}

				const converted = amount * rate;

				// Simple analysis
				let insight = "";
				if (from.toUpperCase() === "JPY" || to.toUpperCase() === "JPY") {
					insight =
						"Note: The Japanese Yen has shown volatility recently due to central bank policies.";
				} else if (from.toUpperCase() === "INR" && to.toUpperCase() === "USD") {
					insight =
						"The INR to USD rate has been relatively stable with slight depreciation over the past year.";
				}

				return {
					content: [
						{
							type: "text",
							text: `${amount} ${from.toUpperCase()} = ${converted.toFixed(
								2
							)} ${to.toUpperCase()}`,
						},
						...(insight ? [{ type: "text", text: insight }] : []),
					],
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
