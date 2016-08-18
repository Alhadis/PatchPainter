target := preview.html

all: $(target) test


# Add just enough styling to match the terminal's look (for easier comparison)
define HTML_START
<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8" />
<title>Preview</title>
<style>
	ins, del, mark{ all: inherit; display: inline }
	body {background: #000; color: #f2f2f2;}
	del {color: #fb0007}
	ins {color: #2fb41d}
	del > mark {color: #f00; background: #800}
	ins > mark {color: #55ff07; background: #107702}
	pre > span {color: #6f6f6f; }
</style>
</head>

<body>
<pre>
endef


# Closing HTML elements
define HTML_END
</pre>
</body>
</html>
endef

export HTML_START
export HTML_END


# Update the HTML preview of the formatted diff
.PHONY: $(target)
$(target):
	@echo $$HTML_START > $@
	./index.js -h >> $@
	@echo $$HTML_END >> $@


# Show the TTY-formatted version of the diff output
.PHONY: test
test:
	@./index.js
