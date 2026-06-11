using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet("auth")]
    [Authorize]
    public IActionResult Get() => Ok(new { message = "Authorized access" });

    [HttpGet("unauth")]
    public IActionResult GetUnauth() => Ok(new { message = "Unauthenticated access" });
}
