const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext();

  const page = await context.newPage();

  await page.goto(
    "https://authserver-443.webvpn.jsei.edu.cn/authserver/login?service=https%3A%2F%2Fwebvpn.jsei.edu.cn%2Fusers%2Fauth%2Fcas%2Fcallback%3Furl",
  );
  await page.fill("#username", "123456");
  await page.fill("#password", "123456");

  await Promise.all([
    page.waitForNavigation(),
    page.click("button.auth_login_btn"),
  ]);

  console.log("登陆成功:", page.url());

  // 点击教务系统（新标签页）
  const [newPage] = await Promise.all([
    page.context().waitForEvent("page"),
    page
      .getByRole("link", {
        name: "教务系统",
      })
      .click(),
  ]);
  await newPage.waitForLoadState();
  console.log("教务系统页面:", newPage.url());

  // 3. 等菜单加载
  await newPage.locator("a.dropdown-toggle", { hasText: "信息查询" }).click();

  // 4. 点击课表（关键：必须在 newPage）
  await newPage.locator('a[onclick*="xskbcxZccx"]').click();

  console.log("page:", page.url());
  console.log("newPage:", newPage.url());

  await newPage.waitForSelector("#table_tb", { timeout: 20000 });

  // =========================
  // 4. 等 lesson 真正渲染出来
  // =========================
  await newPage.waitForFunction(() => {
    return document.querySelectorAll(".lesson").length > 0;
  });

  const lessons = await newPage.$$eval(".lesson", (els) => {
    return els.map((el) => ({
      name: el.getAttribute("data-kcmc"),
      teacher: el.getAttribute("data-jsxm"),
      room: el.getAttribute("data-cdmc"),
      day: Number(el.getAttribute("data-xqj")),
      time: el.getAttribute("data-jcor"),
      weeks: el.getAttribute("data-zcd"),
    }));
  });

  console.log(lessons);

  fs.writeFileSync("lessons.json", JSON.stringify(lessons, null, 2));

  await browser.close();
})();
