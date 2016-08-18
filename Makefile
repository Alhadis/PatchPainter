target := preview.html

all: $(target) test

# Add just enough styling to match the terminal's look (for easier comparison)
define print-css
	echo "<style>ins,del,mark{all: inherit; display: inline}" > $(1);
	echo "body {background: #000; color: #f2f2f2;}" >> $(1);
	echo "del {color: #fb0007}" >> $(1);
	echo "ins {color: #2fb41d}" >> $(1);
	echo "del > mark {color: #f00; background: #800}" >> $(1);
	echo "ins > mark {color: #55ff07; background: #107702}" >> $(1);
	echo "pre > span {color: #6f6f6f; }" >> $(1);
	echo "</style>" >> $(1);
endef


# Update the HTML preview of the formatted diff
.PHONY: $(target)
$(target):
	@$(call print-css,$@)
	@echo "<pre>"  >> $@
	@./index.js -h >> $@
	@echo "</pre>" >> $@


# Show the TTY-formatted version of the diff output
.PHONY: test
test:
	@./index.js
